"use server";

import { doctorFetch } from "@/modules/doctor/api";
import { failureText, renewSession } from "@/modules/doctor/session";
import type { Text } from "@/modules/i18n/types";

const FAILURES: Record<string, string> = {
  slug_taken: "site.doctor.org.slugTaken",
  not_a_member: "site.doctor.org.notMember",
  validation_error: "site.doctor.error.validation",
  membership_revoked: "site.doctor.error.revoked",
};

const failure = (response: Response | null) => failureText(response, FAILURES);

/** As duas ações devolvem o erro, ou `null`: quem chama recarrega a página inteira, para nada
 * da Organização anterior ficar em memória. */
export async function switchOrganization(tenantId: string): Promise<Text | null> {
  const response = await doctorFetch(`/orgs/${encodeURIComponent(tenantId)}/switch`, { method: "POST" }).catch(() => null);
  if (!response?.ok) return failure(response);
  return renewSession();
}

/** O Segmento é texto na API; estes são os valores que as Organizações já criadas têm. */
const SEGMENTS = { consulting: "Consultoria de integração", industry: "Indústria", retail: "Varejo" } as const;

export interface NewOrganization { name: string; slug: string; segment: keyof typeof SEGMENTS; llmProvider: "anthropic" | "vertex"; dpaAccepted: boolean }

export async function createOrganization(input: NewOrganization): Promise<Text | null> {
  if (!(input.segment in SEGMENTS)) return { key: "site.doctor.error.validation" };
  const response = await doctorFetch("/orgs", {
    method: "POST",
    body: JSON.stringify({ name: input.name, slug: input.slug, segment: SEGMENTS[input.segment], llm_provider: input.llmProvider, dpa_accepted: input.dpaAccepted }),
  }).catch(() => null);
  if (!response?.ok) return failure(response);
  return renewSession();
}
