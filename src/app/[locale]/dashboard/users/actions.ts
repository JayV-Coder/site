"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { Text } from "@/modules/i18n/types";
import { authError, supabaseAuth } from "@/modules/supabase/gotrue";
import { userSupabase } from "@/modules/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: Text | string };

/** As recusas das funções do admin chegam como chave do i18n
 * (`admin.forbidden`, `site.users.error.self`, `profile.usernameTaken`). */
function usersFailure(error: { message?: string }) {
  if (error.message && /^(admin|site|profile)\.[A-Za-z.]+$/.test(error.message)) return { key: error.message };
  return error.message ?? "unknown";
}

/** Cada ação é uma função `admin_*` do banco, com o token de quem entrou: o
 * banco confere o admin, recusa agir sobre a própria conta e registra. */
async function call(name: string, args: Record<string, unknown>): Promise<ActionResult> {
  const supabase = await userSupabase();
  if (!supabase) return { ok: false, error: { key: "admin.forbidden" } };
  const { error } = await supabase.rpc(name, args);
  if (error) return { ok: false, error: usersFailure(error) };
  revalidatePath("/[locale]/dashboard/users", "layout");
  return { ok: true };
}

export async function setAdmin(target: string, on: boolean) {
  return call("admin_set_admin", { target, on_off: on });
}

export async function setBanned(target: string, on: boolean) {
  return call("admin_set_banned", { target, on_off: on });
}

export async function signOutEverywhere(target: string) {
  return call("admin_sign_out", { target });
}

export async function confirmEmail(target: string) {
  return call("admin_confirm_email", { target });
}

export async function resetMfa(target: string) {
  return call("admin_reset_mfa", { target });
}

export async function updateProfile(target: string, displayName: string, username: string, unlockUsername: boolean) {
  return call("admin_update_profile", { target, display_name: displayName, username, unlock_username: unlockUsername });
}

export async function deleteUser(target: string) {
  return call("admin_delete_user", { target });
}

/** O link de troca de senha: o banco registra e devolve o e-mail, e o
 * Supabase Auth manda o link. Sem PKCE — ele abre no navegador da pessoa, que
 * não pediu nada — e volta ao `/auth/callback` do site, que segue para a
 * senha nova. */
export async function sendPasswordReset(target: string, locale: string): Promise<ActionResult> {
  const supabase = await userSupabase();
  if (!supabase) return { ok: false, error: { key: "admin.forbidden" } };
  const { data, error } = await supabase.rpc("admin_password_reset", { target });
  if (error) return { ok: false, error: usersFailure(error) };
  const request = await headers();
  const host = request.get("x-forwarded-host") ?? request.get("host");
  const origin = request.get("origin") ?? (host ? `${request.get("x-forwarded-proto") ?? "https"}://${host}` : "");
  const redirectTo = `${origin}/${locale}/auth/callback?next=${encodeURIComponent(`/${locale}/new-password`)}`;
  const response = await supabaseAuth(`recover?redirect_to=${encodeURIComponent(redirectTo)}`, { method: "POST", body: JSON.stringify({ email: data }) });
  if (!response.ok) return { ok: false, error: (await authError(response)).message };
  revalidatePath("/[locale]/dashboard/users", "layout");
  return { ok: true };
}
