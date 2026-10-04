/** O usuário como o `GET /auth/v1/user` do Supabase o devolve (só o que o
 * site lê). */
export interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  factors?: { status: string; factor_type: string }[];
}

export interface Claims { sub: string; exp: number; aal?: string }

/** O conteúdo do JWT, sem conferir a assinatura: quem confere é o Supabase,
 * no `GET /auth/v1/user` (e em cada consulta). */
export function decodeClaims(token: string): Claims | null {
  try {
    const part = token.split(".")[1];
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const json = new TextDecoder().decode(Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)));
    const claims = JSON.parse(json) as Partial<Claims>;
    return typeof claims.sub === "string" && typeof claims.exp === "number" ? (claims as Claims) : null;
  } catch {
    return null;
  }
}

/** A conta tem um app autenticador confirmado e o token ainda é `aal1`. */
export const needsMoreAssurance = (user: SupabaseUser, claims: Claims) =>
  (user.factors ?? []).some((factor) => factor.status === "verified") && claims.aal !== "aal2";

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

/** O nome de quem entrou: o do perfil do app, ou o do provedor. */
export function displayName(user: SupabaseUser) {
  const meta = user.user_metadata ?? {};
  return text(meta.display_name) ?? text(meta.full_name) ?? text(meta.name) ?? text(meta.user_name) ?? text(meta.preferred_username);
}

export function avatarUrl(user: SupabaseUser) {
  const meta = user.user_metadata ?? {};
  return text(meta.avatar_url) ?? text(meta.picture);
}
