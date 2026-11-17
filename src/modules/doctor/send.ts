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

/** `layout`: revalida a rota e as de baixo (a lista e o detalhe mudam juntos). */
type Options = { revalidate?: string; layout?: boolean; known?: Record<string, string>; invalid?: string; key?: string };

async function call(path: string, init: RequestInit, options: Options): Promise<{ response: Response } | { error: Text }> {
  const response = await doctorFetch(path, {
    ...init,
    headers: { ...Object.fromEntries(new Headers(init.headers)), ...(options.key && { "Idempotency-Key": options.key }) },
  }).catch(() => null);
  if (!response) return { error: { key: "site.doctor.error.offline" } };
  if (!response.ok) {
    const { code } = (await response.json().catch(() => ({}))) as { code?: string };
    if (code === "validation_error") return { error: { key: options.invalid ?? "site.doctor.error.validation" } };
    return { error: { key: options.known?.[code ?? ""] ?? FAILURES[code ?? ""] ?? "site.doctor.error.generic" } };
  }
  if (options.revalidate) revalidatePath(options.revalidate, options.layout ? "layout" : "page");
  return { response };
}

/** Uma escrita na API: devolve `null` quando deu certo, ou o erro já como chave de texto.
 * `known` traduz os `code` próprios da tela; `validation_error` vira `invalid`. */
export async function sendToDoctor(path: string, init: RequestInit, options: Options & { revalidate: string }): Promise<Text | null> {
  const result = await call(path, init, options);
  return "error" in result ? result.error : null;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: Text };

/** A mesma escrita, para quem precisa da resposta (o id do relatório, o link criado). */
export async function sendForResult<T>(path: string, init: RequestInit, options: Options): Promise<Result<T>> {
  const result = await call(path, init, options);
  if ("error" in result) return { ok: false, error: result.error };
  return { ok: true, value: (await result.response.json()) as T };
}
