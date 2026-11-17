import "server-only";
import { unstable_update } from "@/auth";
import type { Text } from "@/modules/i18n/types";

/** A Organização ativa vai nas claims do token, e elas só mudam num token novo: sem renovar
 * a sessão, a API continuaria respondendo pela Organização anterior. Quem chama recarrega a
 * página inteira, para nada da Organização anterior ficar em memória. */
export async function renewSession(): Promise<Text | null> {
  const session = await unstable_update({ refresh: true } as Parameters<typeof unstable_update>[0]);
  return session?.accessToken ? null : { key: "site.doctor.org.renewFailed" };
}

/** O texto da recusa da API pelo `code`, com os conhecidos de quem chama (e o seu genérico). */
export async function failureText(response: Response | null, known: Record<string, string>, fallback = "site.doctor.error.generic"): Promise<Text> {
  if (!response) return { key: "site.doctor.error.offline" };
  const { code } = (await response.json().catch(() => ({}))) as { code?: string };
  return { key: (code && Object.hasOwn(known, code) ? known[code] : undefined) ?? fallback };
}
