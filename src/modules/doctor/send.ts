import "server-only";
import { revalidatePath } from "next/cache";
import type { Text } from "@/modules/i18n/types";
import { doctorFetch } from "./api";

/** Os erros da API do Doctor que a tela explica; o resto vira a mensagem genérica. A API
 * responde `application/problem+json` com um `code` estável. */
const FAILURES: Record<string, string> = {
  forbidden: "site.doctor.error.forbidden",
  mfa_required: "site.doctor.error.mfaRequired",
  membership_revoked: "site.doctor.error.revoked",
  not_found: "site.doctor.error.notFound",
  rate_limited: "site.doctor.error.rateLimited",
};

/** Uma escrita na API: devolve `null` quando deu certo, ou o erro já como chave de texto.
 * `known` traduz os `code` próprios da tela; `validation_error` vira `invalid`. */
export async function sendToDoctor(
  path: string,
  init: RequestInit,
  options: { revalidate: string; known?: Record<string, string>; invalid?: string; key?: string },
): Promise<Text | null> {
  const response = await doctorFetch(path, {
    ...init,
    headers: { ...Object.fromEntries(new Headers(init.headers)), ...(options.key && { "Idempotency-Key": options.key }) },
  }).catch(() => null);
  if (!response) return { key: "site.doctor.error.offline" };
  if (!response.ok) {
    const { code } = (await response.json().catch(() => ({}))) as { code?: string };
    if (code === "validation_error") return { key: options.invalid ?? "site.doctor.error.validation" };
    return { key: options.known?.[code ?? ""] ?? FAILURES[code ?? ""] ?? "site.doctor.error.generic" };
  }
  revalidatePath(options.revalidate, "page");
  return null;
}
