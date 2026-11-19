import "server-only";
import { userSupabase } from "@/modules/supabase/server";

/** Leitura direta no Supabase (ADR-0026 do jayv-doctor): a função do schema `doctor_read`, com o
 * token de quem entrou e o RLS, numa chamada ao PostgREST. A API do Doctor roda longe do banco;
 * daqui a leitura vai direto. `ok: false` quando não deu (sem sessão, schema ainda não exposto,
 * erro): quem chama volta para a API, que segue servindo a mesma leitura. */
export async function doctorRead<T>(fn: string, args: Record<string, unknown> = {}): Promise<{ ok: true; value: T } | { ok: false }> {
  const supabase = await userSupabase();
  if (!supabase) return { ok: false };
  try {
    const { data, error } = await supabase.schema("doctor_read").rpc(fn, args);
    if (error) {
      // PGRST106: `doctor_read` ainda não está em "Exposed schemas" (Settings → Data API).
      console.warn(`doctor_read.${fn} falhou (${error.code}); lendo pela API`);
      return { ok: false };
    }
    return { ok: true, value: data as T };
  } catch (cause) {
    console.warn(`doctor_read.${fn} falhou (${cause instanceof Error ? cause.name : "erro"}); lendo pela API`);
    return { ok: false };
  }
}
