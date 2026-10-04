import { SUPABASE_KEY, SUPABASE_URL } from "./config";

/** O Supabase Auth pela API REST, no servidor: o login do NextAuth, a
 * renovação da sessão e o que a página Conta faz (senha, app autenticador,
 * contas vinculadas). `token` é o de quem entrou. */
export async function supabaseAuth(path: string, init: RequestInit & { token?: string } = {}) {
  const { token, ...rest } = init;
  const headers: Record<string, string> = { apikey: SUPABASE_KEY, "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${SUPABASE_URL}/auth/v1/${path}`, { ...rest, headers, cache: "no-store" });
}

/** Os tokens de uma sessão nova do Supabase (`/token`, `/factors/.../verify`). */
export interface Tokens { accessToken: string; refreshToken: string }

/** O erro do Supabase Auth com o código que a tela sabe explicar
 * (`authFailure`): `{ code, message }`. */
export async function authError(response: Response) {
  const body = (await response.json().catch(() => ({}))) as { error_code?: string; code?: string | number; msg?: string; message?: string; error_description?: string };
  const code = body.error_code ?? (typeof body.code === "string" ? body.code : undefined);
  return { code, message: body.msg ?? body.message ?? body.error_description ?? `auth ${response.status}` };
}

/** Lê a resposta como JSON, ou lança o erro do Supabase Auth. */
export async function authJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw await authError(response);
  return (await response.json()) as T;
}

export function tokensOf(body: { access_token: string; refresh_token: string }): Tokens {
  return { accessToken: body.access_token, refreshToken: body.refresh_token };
}
