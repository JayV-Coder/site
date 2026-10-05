"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { auth, unstable_update } from "@/auth";
import {
  enrollTotp as enroll, linkUrl, passwordLogin, pkce, readUser, refreshTokens, removeFactor, sendReauthentication, unlinkIdentity,
  updatePassword, verifiedTotp, verifyFactor, type TotpEnrollment,
} from "@/modules/auth/account";
import { codeOk } from "@/modules/auth/code";
import { authFailure } from "@/modules/auth/errors";
import { canUnlink, isProvider, type Provider } from "@/modules/auth/identities";
import { totpOk } from "@/modules/auth/mfa";
import { passwordOk } from "@/modules/auth/password";
import { isText } from "@/modules/i18n/render";
import type { Text } from "@/modules/i18n/types";
import { extensionOf, uploadable } from "@/modules/profile/crop";
import { normalizeProfile, toRow, usernameOk, type AccountProfile } from "@/modules/profile/fields";
import type { Tokens } from "@/modules/supabase/gotrue";
import { userSupabase } from "@/modules/supabase/server";
import { LINK_COOKIE, type LinkCookie } from "./link/cookie";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: Text | string };

/** A recusa do Supabase vira a chave do i18n que a tela sabe explicar. */
const failed = (error: unknown): { ok: false; error: Text | string } => {
  const reason = authFailure(error);
  return { ok: false, error: isText(reason) || typeof reason === "string" ? reason : "unknown" };
};

/** O token de quem entrou; sem ele, a ação nem começa. */
async function token() {
  const session = await auth();
  if (!session?.accessToken) throw { key: "site.session.failed" };
  return session.accessToken;
}

/** A sessão nova (senha trocada, app autenticador confirmado ou removido)
 * passa a ser a do cookie do NextAuth. */
async function keep(tokens: Tokens) {
  await unstable_update({ supabase: tokens });
}

async function run<T>(action: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await action();
    revalidatePath("/[locale]/dashboard/account", "page");
    return { ok: true, data };
  } catch (error) {
    return failed(error);
  }
}

/** O banco recusou um valor que passou pela tela: nome de usuário tomado
 * (índice único), nome de usuário já fixo ou outro `check`. Igual ao app. */
function profileFailure(error: { code?: string; message?: string }) {
  if (error.code === "23505") return { key: "profile.usernameTaken" };
  if (error.message === "profile.username.locked") return { key: "profile.username.locked" };
  return error.code === "23514" || error.code === "22007" || error.code === "22008" ? { key: "profile.invalid" } : error.message ?? "unknown";
}

/** Salvar marca `completed_at` e fixa o nome de usuário (o banco guarda só a
 * primeira vez), como no app. */
export async function saveProfile(draft: AccountProfile): Promise<ActionResult> {
  const supabase = await userSupabase();
  const session = await auth();
  if (!supabase || !session?.user.id) return { ok: false, error: { key: "site.session.failed" } };
  const now = new Date().toISOString();
  const { error } = await supabase.from("profiles")
    .update({ ...toRow(normalizeProfile(draft)), completed_at: now, username_set_at: now })
    .eq("user_id", session.user.id);
  if (error) return { ok: false, error: profileFailure(error) };
  revalidatePath("/[locale]/dashboard/account", "page");
  return { ok: true, data: undefined };
}

/** O bucket público das fotos de perfil (migração `profile_photo`). */
const PHOTOS = "avatars";

/** Erro do banco com chave do i18n (`site.account.photo.invalid`) vira texto
 * traduzido; o resto vai como motivo técnico. */
const photoFailure = (message: string) => ({ ok: false as const, error: message.startsWith("site.") ? { key: message } : message });

/** Apaga da pasta da conta as fotos que não são a atual (`keep`). Falhar aqui
 * só deixa um arquivo a mais: a foto gravada já é a nova. */
async function prunePhotos(supabase: NonNullable<Awaited<ReturnType<typeof userSupabase>>>, userId: string, keep?: string) {
  try {
    const bucket = supabase.storage.from(PHOTOS);
    const { data } = await bucket.list(userId, { limit: 100 });
    const stale = (data ?? []).map((item) => `${userId}/${item.name}`).filter((path) => path !== keep);
    if (stale.length) await bucket.remove(stale);
  } catch (error) {
    console.error("photo prune", error);
  }
}

/** Grava a foto que o navegador já recortou (512 × 512): sobe para a pasta da
 * conta no Storage e o banco passa a usá-la em todo login, no site e no app. */
export async function uploadProfilePhoto(form: FormData): Promise<ActionResult<string>> {
  const supabase = await userSupabase();
  const session = await auth();
  const userId = session?.user.id;
  if (!supabase || !userId) return { ok: false, error: { key: "site.session.failed" } };
  const file = form.get("photo");
  if (!(file instanceof Blob) || !uploadable(file)) return { ok: false, error: { key: "site.account.photo.invalid" } };
  const path = `${userId}/${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${extensionOf(file.type)}`;
  const bucket = supabase.storage.from(PHOTOS);
  const { error: uploading } = await bucket.upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (uploading) return photoFailure(uploading.message);
  const url = bucket.getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.rpc("profile_photo_set", { url });
  if (error) {
    await bucket.remove([path]).catch(() => {});
    return photoFailure(error.message);
  }
  await prunePhotos(supabase, userId, path);
  // O cabeçalho de todas as páginas mostra a foto.
  revalidatePath("/[locale]", "layout");
  return { ok: true, data: url };
}

/** Tira a foto própria: volta a do provedor (ou nenhuma) e apaga os arquivos. */
export async function removeProfilePhoto(): Promise<ActionResult<string | null>> {
  const supabase = await userSupabase();
  const session = await auth();
  const userId = session?.user.id;
  if (!supabase || !userId) return { ok: false, error: { key: "site.session.failed" } };
  const { data, error } = await supabase.rpc("profile_photo_clear");
  if (error) return photoFailure(error.message);
  await prunePhotos(supabase, userId);
  revalidatePath("/[locale]", "layout");
  return { ok: true, data: typeof data === "string" ? data : null };
}

/** Pergunta ao banco sem ler perfil nenhum; nulo quando não deu para saber. */
export async function usernameAvailable(name: string): Promise<boolean | null> {
  const supabase = await userSupabase();
  if (!supabase || !usernameOk(name)) return null;
  const { data, error } = await supabase.rpc("username_available", { name });
  return error ? null : data === true;
}

/** Trocar a senha confere a atual entrando de novo; com o app autenticador, o
 * código dele sobe essa sessão nova para `aal2` antes da troca. Se algo falha
 * no meio, a sessão guardada continua a de antes. */
export async function changePassword(current: string, next: string, code?: string) {
  return run(async () => {
    if (!passwordOk(next)) throw { code: "weak_password" };
    const user = await readUser(await token());
    if (!user.email) throw new Error("account without email");
    let fresh = await passwordLogin(user.email, current);
    const factor = verifiedTotp(user);
    if (factor) {
      if (!code || !totpOk(code)) throw { code: "mfa_verification_failed" };
      fresh = await verifyFactor(fresh.accessToken, factor, code);
    }
    await updatePassword(fresh.accessToken, next);
    await keep(fresh);
  });
}

/** A primeira senha de quem entrou só por provedor pede o código do e-mail,
 * para que uma sessão aberta não baste para cravar uma senha na conta. */
export async function sendSetPasswordCode() {
  return run(async () => sendReauthentication(await token()));
}

export async function setFirstPassword(code: string, password: string) {
  return run(async () => {
    if (!passwordOk(password)) throw { code: "weak_password" };
    if (!codeOk(code)) throw { code: "reauthentication_not_valid" };
    await updatePassword(await token(), password, code.trim());
  });
}

export async function enrollTotp(): Promise<ActionResult<TotpEnrollment>> {
  try {
    return { ok: true, data: await enroll(await token()) };
  } catch (error) {
    return failed(error);
  }
}

/** O primeiro código confirma o cadastro e já sobe a sessão para `aal2`. */
export async function confirmTotp(factorId: string, code: string) {
  return run(async () => keep(await verifyFactor(await token(), factorId, code)));
}

/** Só desfaz o cadastro que não chegou ao primeiro código: o app já
 * confirmado sai por `removeTotp`, que pede um código atual. */
export async function cancelTotp(factorId: string) {
  return run(async () => {
    const current = await token();
    const factor = (await readUser(current)).factors?.find((known) => known.id === factorId);
    if (!factor || factor.factor_type !== "totp" || factor.status === "verified") throw { code: "mfa_verification_failed" };
    await removeFactor(current, factorId);
  });
}

/** Desligar pede um código atual do app: uma sessão esquecida aberta não
 * basta para tirar a proteção da conta. A sessão é renovada em seguida para
 * deixar de carregar o fator removido. */
export async function removeTotp(code: string) {
  return run(async () => {
    const current = await token();
    const factor = verifiedTotp(await readUser(current));
    if (!factor) return;
    const elevated = await verifyFactor(current, factor, code);
    await removeFactor(elevated.accessToken, factor);
    await keep(await refreshTokens(elevated.refreshToken));
  });
}

/** Desvincular fica travado enquanto for a única forma de entrar. */
export async function unlinkProvider(provider: Provider) {
  return run(async () => {
    if (!isProvider(provider)) throw { code: "single_identity_not_deletable" };
    const current = await token();
    const supabase = await userSupabase();
    const [user, password] = await Promise.all([readUser(current), supabase?.rpc("account_has_password")]);
    const providers = (user.identities ?? []).map((identity) => identity.provider);
    if (!canUnlink(providers, password?.data === true, provider)) throw { code: "single_identity_not_deletable" };
    const identity = user.identities?.find((known) => known.provider === provider);
    if (!identity) return;
    await unlinkIdentity(current, identity.identity_id ?? identity.id);
  });
}

/** Vincular abre o provedor, que volta para `/dashboard/account/link`; o
 * verificador do PKCE espera lá num cookie que só o servidor lê. */
export async function linkProvider(provider: Provider, locale: string): Promise<ActionResult<string>> {
  try {
    if (!isProvider(provider)) throw { code: "single_identity_not_deletable" };
    const request = await headers();
    const host = request.get("x-forwarded-host") ?? request.get("host");
    const origin = request.get("origin") ?? (host ? `${request.get("x-forwarded-proto") ?? "https"}://${host}` : null);
    if (!origin) throw new Error("unknown origin");
    const { verifier, challenge } = pkce();
    const url = await linkUrl(await token(), provider, `${origin}/${locale}/dashboard/account/link`, challenge);
    const value: LinkCookie = { verifier, provider, locale };
    (await cookies()).set(LINK_COOKIE, JSON.stringify(value), {
      httpOnly: true, sameSite: "lax", secure: origin.startsWith("https://"), maxAge: 600, path: "/",
    });
    return { ok: true, data: url };
  } catch (error) {
    return failed(error);
  }
}
