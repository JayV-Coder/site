import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { authError, authJson, supabaseAuth, tokensOf, type Tokens } from "@/modules/supabase/gotrue";

/** O usuário como o `GET /auth/v1/user` o devolve, com o que a página Conta
 * lê: identidades e fatores. */
export interface AuthUser {
  id: string;
  email?: string;
  created_at?: string;
  last_sign_in_at?: string;
  /** `provider` é o do último login (`email`, `github`, `gitlab`, `bitbucket`). */
  app_metadata?: { provider?: string };
  user_metadata?: Record<string, unknown>;
  identities?: { identity_id?: string; id: string; provider: string }[];
  factors?: { id: string; factor_type: string; status: string }[];
}

export const readUser = async (token: string) => authJson<AuthUser>(await supabaseAuth("user", { token }));

/** O app autenticador já confirmado, quando a conta tem um. */
export const verifiedTotp = (user: AuthUser) => (user.factors ?? []).find((factor) => factor.factor_type === "totp" && factor.status === "verified")?.id ?? null;

type SessionBody = { access_token: string; refresh_token: string };

/** O código do app autenticador sobe a sessão para `aal2` e devolve os tokens
 * dela (o `challengeAndVerify` do supabase-js). */
export async function verifyFactor(token: string, factorId: string, code: string): Promise<Tokens> {
  const challenge = await authJson<{ id: string }>(await supabaseAuth(`factors/${factorId}/challenge`, { method: "POST", token, body: "{}" }));
  const verified = await authJson<SessionBody>(await supabaseAuth(`factors/${factorId}/verify`, {
    method: "POST", token, body: JSON.stringify({ challenge_id: challenge.id, code: code.trim() }),
  }));
  return tokensOf(verified);
}

/** Entra de novo com a senha: confere a atual e renova a sessão, que é o que
 * o "secure password change" do Supabase pede. */
export async function passwordLogin(email: string, password: string): Promise<Tokens> {
  const response = await supabaseAuth("token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
  if (!response.ok) {
    const failure = await authError(response);
    throw failure.code === "invalid_credentials" ? { code: "wrong_password" } : failure;
  }
  return tokensOf((await response.json()) as SessionBody);
}

export async function refreshTokens(refreshToken: string): Promise<Tokens> {
  return tokensOf(await authJson<SessionBody>(await supabaseAuth("token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) })));
}

export async function updatePassword(token: string, password: string, nonce?: string) {
  await authJson(await supabaseAuth("user", { method: "PUT", token, body: JSON.stringify(nonce ? { password, nonce } : { password }) }));
}

/** O código que vai ao e-mail antes da primeira senha. */
export async function sendReauthentication(token: string) {
  const response = await supabaseAuth("reauthenticate", { token });
  if (!response.ok) await authJson(response);
}

export interface TotpEnrollment { factorId: string; qrCode: string; secret: string }

/** Cadastra o app autenticador. Um cadastro anterior que não chegou ao
 * primeiro código sai antes, para não acumular fatores pela metade. O QR code
 * já vem pronto do Supabase, como imagem SVG. */
export async function enrollTotp(token: string): Promise<TotpEnrollment> {
  const user = await readUser(token);
  for (const stale of user.factors ?? []) {
    if (stale.factor_type === "totp" && stale.status !== "verified") await removeFactor(token, stale.id);
  }
  const enrolled = await authJson<{ id: string; totp: { qr_code: string; secret: string } }>(
    await supabaseAuth("factors", { method: "POST", token, body: JSON.stringify({ factor_type: "totp", issuer: "JayV" }) }),
  );
  return { factorId: enrolled.id, qrCode: enrolled.totp.qr_code, secret: enrolled.totp.secret };
}

export async function removeFactor(token: string, factorId: string) {
  const response = await supabaseAuth(`factors/${factorId}`, { method: "DELETE", token });
  if (!response.ok) await authJson(response);
}

export async function unlinkIdentity(token: string, identityId: string) {
  const response = await supabaseAuth(`user/identities/${identityId}`, { method: "DELETE", token });
  if (!response.ok) await authJson(response);
}

const base64url = (bytes: Buffer) => bytes.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** O PKCE do vínculo: o verificador fica num cookie do servidor e o desafio
 * vai ao Supabase. */
export function pkce() {
  const verifier = base64url(randomBytes(48));
  return { verifier, challenge: base64url(createHash("sha256").update(verifier).digest()) };
}

/** O endereço do provedor para vincular a identidade à conta de quem entrou
 * (o `linkIdentity` do supabase-js). */
export async function linkUrl(token: string, provider: string, redirectTo: string, challenge: string) {
  const query = new URLSearchParams({ provider, redirect_to: redirectTo, skip_http_redirect: "true", code_challenge: challenge, code_challenge_method: "s256" });
  return (await authJson<{ url: string }>(await supabaseAuth(`user/identities/authorize?${query}`, { token }))).url;
}

/** A volta do provedor: o código vira a sessão, com o verificador guardado. */
export async function exchangeCode(code: string, verifier: string): Promise<Tokens> {
  return tokensOf(await authJson<SessionBody>(await supabaseAuth("token?grant_type=pkce", {
    method: "POST", body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
  })));
}
