"use server";

import { doctorPublicFetch } from "@/modules/doctor/api";

export type SsoDiscovery = { domain: string; required: boolean };

/** O login pergunta ao Doctor se o domínio do e-mail entra pelo SSO de uma Organização
 * (`GET /sso/discover`, sem sessão, com limite por IP). Qualquer falha ou demora vira "não":
 * o login de senha do site não pode depender da API do Doctor. */
export async function discoverSso(email: string): Promise<SsoDiscovery | null> {
  const address = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) || address.length > 320) return null;
  const response = await doctorPublicFetch(`/sso/discover?${new URLSearchParams({ email: address })}`, { signal: AbortSignal.timeout(2000) }).catch(() => null);
  if (!response?.ok) return null;
  const found = (await response.json().catch(() => null)) as { sso?: unknown; required?: unknown; domain?: unknown } | null;
  return found?.sso === true && typeof found.domain === "string" ? { domain: found.domain, required: found.required === true } : null;
}
