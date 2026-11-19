import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/auth";
import { decodeClaims } from "@/modules/auth/session";
import { SUPABASE_KEY, SUPABASE_URL } from "@/modules/supabase/config";

/** O Supabase com o token de quem entrou, um por requisição (`cache`): todas as leituras da
 * página usam o mesmo cliente. `tenant`: a Organização ativa do JWT, se houver. */
const reader = cache(async () => {
  const session = await auth();
  if (!session?.accessToken) return null;
  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${session.accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return { client, tenant: decodeClaims(session.accessToken)?.tenant_id ?? null };
});

const EXPECTED = new Set(["DR110", "DR112"]);

/** Leitura direta no Supabase (ADR-0026 do jayv-doctor): a função do schema `doctor_read`, com o
 * token de quem entrou e o RLS, numa chamada ao PostgREST. A API do Doctor roda longe do banco;
 * daqui a leitura vai direto. `ok: false` quando não deu (sem sessão, sem Organização ativa,
 * schema ainda não exposto, erro): quem chama volta para a API. Só o `me` lê sem Organização. */
export async function doctorRead<T>(fn: string, args: Record<string, unknown> = {}): Promise<{ ok: true; value: T } | { ok: false }> {
  const current = await reader();
  if (!current || (fn !== "me" && !current.tenant)) return { ok: false };
  try {
    const { data, error } = await current.client.schema("doctor_read").rpc(fn, args);
    if (error) {
      // Esperados: DR110 (sem Organização ativa, logo depois de trocar) e DR112 (a Organização
      // exige MFA; a página manda configurá-lo). O resto vai para o log: PGRST106 é o
      // `doctor_read` fora de "Exposed schemas" (Settings → Data API), e 42501, uma permissão
      // faltando numa função nova.
      if (!EXPECTED.has(error.code)) console.warn(`doctor_read.${fn} falhou (${error.code}); lendo pela API`);
      return { ok: false };
    }
    return { ok: true, value: data as T };
  } catch (cause) {
    console.warn(`doctor_read.${fn} falhou (${cause instanceof Error ? cause.name : "erro"}); lendo pela API`);
    return { ok: false };
  }
}

/** A leitura direta, ou `fallback` (a mesma leitura pela API) se ela não der. */
export async function readOr<T>(fn: string, args: Record<string, unknown>, fallback: () => Promise<T | null>): Promise<T | null> {
  const direct = await doctorRead<T>(fn, args);
  return direct.ok ? direct.value : fallback();
}
