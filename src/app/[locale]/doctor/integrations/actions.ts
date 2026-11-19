"use server";

import { sendToDoctor } from "@/modules/doctor/send";
import type { IntegrationDraft, LookupDraft, MappingKey } from "@/modules/doctor/integrations";
import { integrationChange, lookupFromDraft } from "@/modules/doctor/integrations";
import type { Text } from "@/modules/i18n/types";

const LIST = "/[locale]/doctor/integrations";
const MAPS = "/[locale]/doctor/integrations/[id]/maps";

/** Campo opcional vazio vai como ausente: a API guarda `null`, não texto vazio. */
const optional = (value: string) => (value.trim() ? value.trim() : undefined);

export async function createIntegration(draft: IntegrationDraft, key: string): Promise<Text | null> {
  return sendToDoctor("/integrations", {
    method: "POST",
    body: JSON.stringify({
      name: draft.name.trim(), source_system: draft.source_system, target_system: draft.target_system, environment: draft.environment,
      owner_team: optional(draft.owner_team), description: optional(draft.description),
    }),
  }, {
    revalidate: LIST, key, invalid: "site.doctor.integration.error.invalid",
    known: { integration_exists: "site.doctor.integration.error.exists" },
  });
}

const KNOWN = {
  integration_exists: "site.doctor.integration.error.exists",
  integration_archived: "site.doctor.integration.error.archived",
  integration_in_use: "site.doctor.integration.error.inUse",
} as const;

export async function updateIntegration(id: string, draft: IntegrationDraft, key: string): Promise<Text | null> {
  return sendToDoctor(`/integrations/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(integrationChange(draft)) }, {
    revalidate: LIST, key, invalid: "site.doctor.integration.error.invalid", known: KNOWN,
  });
}

/** Exclusão de verdade, só sem histórico; com histórico, a API responde `integration_in_use`. */
export async function deleteIntegration(id: string, key: string): Promise<Text | null> {
  return sendToDoctor(`/integrations/${encodeURIComponent(id)}`, { method: "DELETE" }, { revalidate: LIST, key, known: KNOWN });
}

export async function archiveIntegration(id: string, key: string): Promise<Text | null> {
  return sendToDoctor(`/integrations/${encodeURIComponent(id)}/archive`, { method: "POST" }, {
    revalidate: LIST, key, known: { integration_archived: "site.doctor.integration.error.archived" },
  });
}

export async function createMapping(
  integration: string,
  mapping: { name: string; keys: MappingKey[]; window: number; reconcile: boolean; lookup: LookupDraft },
  key: string,
): Promise<Text | null> {
  return sendToDoctor(`/integrations/${encodeURIComponent(integration)}/correlation-mappings`, {
    method: "POST",
    body: JSON.stringify({
            // Janela vazia ou fora do intervalo vira a padrão (60 min), não um 0 que a API recusa.
      name: mapping.name.trim(), keys: mapping.keys, window_minutes: Number.isInteger(mapping.window) && mapping.window >= 1 && mapping.window <= 1440 ? mapping.window : 60,
      reconcile: mapping.reconcile, lookup: lookupFromDraft(mapping.lookup),
    }),
  }, {
    revalidate: MAPS, key, invalid: "site.doctor.mapping.error.invalid",
    known: { mapping_exists: "site.doctor.mapping.error.exists", invalid_mapping: "site.doctor.mapping.error.invalid", integration_archived: "site.doctor.integration.error.archived" },
  });
}

export async function deleteMapping(id: string, key: string): Promise<Text | null> {
  return sendToDoctor(`/correlation-mappings/${encodeURIComponent(id)}`, { method: "DELETE" }, { revalidate: MAPS, key });
}
