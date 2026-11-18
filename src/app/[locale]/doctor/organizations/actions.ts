"use server";

import { doctorFetch } from "@/modules/doctor/api";
import { isSegment, segmentValue, type Segment } from "@/modules/doctor/segments";
import { failureText, renewSession } from "@/modules/doctor/session";
import type { Text } from "@/modules/i18n/types";

const FAILURES: Record<string, string> = {
  slug_taken: "site.doctor.org.slugTaken",
  not_a_member: "site.doctor.org.notMember",
  not_owner: "site.doctor.org.notOwner",
  not_found: "site.doctor.org.notMember",
  already_enabled: "site.doctor.org.alreadyEnabled",
  validation_error: "site.doctor.error.validation",
  membership_revoked: "site.doctor.error.revoked",
};

const failure = (response: Response | null) => failureText(response, FAILURES);

/** As ações devolvem o erro, ou `null`: quem chama recarrega a página inteira, para nada da
 * Organização anterior ficar em memória. */
export async function switchOrganization(tenantId: string): Promise<Text | null> {
  const response = await doctorFetch(`/orgs/${encodeURIComponent(tenantId)}/switch`, { method: "POST" }).catch(() => null);
  if (!response?.ok) return failure(response);
  return renewSession();
}

export type { Segment };
export type Provider = "anthropic" | "vertex";

export interface DoctorSettings { segment: Segment; llmProvider: Provider; dpaAccepted: true }

function settingsBody(settings: DoctorSettings) {
  return { segment: segmentValue(settings.segment), llm_provider: settings.llmProvider, dpa_accepted: settings.dpaAccepted };
}

export async function createOrganization(input: { name: string; slug: string } & DoctorSettings): Promise<Text | null> {
  if (!isSegment(input.segment)) return { key: "site.doctor.error.validation" };
  const response = await doctorFetch("/orgs", {
    method: "POST",
    body: JSON.stringify({ name: input.name, slug: input.slug, ...settingsBody(input) }),
  }).catch(() => null);
  if (!response?.ok) return failure(response);
  return renewSession();
}

/** Ativa o Doctor numa Organização que já existe no jayv-coder (só o owner de lá): os membros
 * entram com o Papel equivalente, e ela fica ativa para quem ativou. */
export async function enableOrganization(orgId: string, settings: DoctorSettings): Promise<Text | null> {
  if (!isSegment(settings.segment)) return { key: "site.doctor.error.validation" };
  const response = await doctorFetch(`/orgs/${encodeURIComponent(orgId)}/enable`, {
    method: "POST",
    body: JSON.stringify(settingsBody(settings)),
  }).catch(() => null);
  if (!response?.ok) return failure(response);
  return renewSession();
}
