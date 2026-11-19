import type { Key } from "@/modules/i18n";
import { systemLabel } from "./executions";

/** As regras de tela das Integrações (Tela 10) e dos Mapas entre sistemas (#40) que não
 * dependem de servidor nem de idioma. */

export { SYSTEMS as INTEGRATION_SYSTEMS } from "./diagnosis";

/** O formulário de Integração, criar ou editar (texto livre nos campos opcionais). */
export type IntegrationDraft = {
  name: string; source_system: string; target_system: string; environment: string; owner_team: string; description: string;
};

/** Os campos para a API, aparados; opcional vazio vai como `null` (criar: sem valor; editar:
 * limpar). Um lugar só para criar e editar. */
export function integrationFields(draft: IntegrationDraft) {
  const optional = (value: string) => value.trim() || null;
  return {
    name: draft.name.trim(), source_system: draft.source_system, target_system: draft.target_system, environment: draft.environment,
    owner_team: optional(draft.owner_team), description: optional(draft.description),
  };
}

/** O corpo do `PATCH /integrations/{id}`: só os campos que mudaram desde que o formulário abriu,
 * para não desfazer o que outra pessoa salvou nos outros. Vazio: nada a enviar. */
export function integrationChange(draft: IntegrationDraft, initial: IntegrationDraft) {
  const next = integrationFields(draft);
  const before = integrationFields(initial);
  return Object.fromEntries(
    (Object.keys(next) as (keyof typeof next)[]).filter((field) => next[field] !== before[field]).map((field) => [field, next[field]]),
  ) as Partial<ReturnType<typeof integrationFields>>;
}

export function environmentVariant(environment: string): "destructive" | "secondary" | "outline" {
  if (environment === "prd") return "destructive";
  return environment === "hml" ? "secondary" : "outline";
}

/** Os sistemas de uma chave do Mapa: os da Integração mais os middlewares comuns. Os nomes vêm
 * da mesma lista das raias da Timeline. */
export const MAPPING_SYSTEMS = ["salesforce", "gcp", "sap", "mulesoft", "aws", "azure", "custom"] as const;
export const mappingSystemName = systemLabel;

export type KeyRow = { system: string; field: string; prefix: string; zeros: boolean; upper: boolean };
export type Transform = { op: string; value?: string };
export type MappingKey = { system: string; field: string; transforms?: Transform[] };

/** Linhas na ordem do fluxo: origem, middleware, destino. */
export function defaultRows(source: string, target: string): KeyRow[] {
  return [source, "gcp", target].map((system) => ({
    system: system === "other" ? "custom" : system, field: "", prefix: "", zeros: false, upper: false,
  }));
}

export function keysFromRows(rows: readonly KeyRow[]): MappingKey[] {
  return rows.filter((row) => row.field.trim()).map((row) => {
    // Os passos rodam na ordem: com maiúsculas, elas vêm antes e o prefixo também vai em
    // maiúsculas, senão "sf-" não casaria com "SF-".
    const transforms: Transform[] = [{ op: "trim" }];
    if (row.upper) transforms.push({ op: "upper" });
    const prefix = row.upper ? row.prefix.trim().toUpperCase() : row.prefix.trim();
    if (prefix) transforms.push({ op: "strip_prefix", value: prefix });
    if (row.zeros) transforms.push({ op: "strip_leading_zeros" });
    return { system: row.system, field: row.field.trim(), transforms };
  });
}

export type LookupDraft = { connector: string; entity: string; field: string; statusField: string; idField: string; pad: string };

export function lookupFromDraft(draft: LookupDraft) {
  if (!draft.connector) return null;
  const pad = Number(draft.pad || "0");
  return {
    connector_id: draft.connector,
    entity: draft.entity.trim(),
    field: draft.field.trim(),
    status_field: draft.statusField.trim() || null,
    id_field: draft.idField.trim() || null,
    pad_left: Number.isFinite(pad) ? pad : 0,
  };
}

const STEPS = ["strip_prefix", "strip_suffix", "strip_leading_zeros", "upper", "lower"];

/** O resumo de uma chave para a lista: o sistema, o campo e os passos que a tela conhece
 * (aparar é sempre feito e não precisa aparecer). */
export function keyParts(key: MappingKey): { system: { name: string } | { key: Key }; field: string; steps: { key: Key; value?: string }[] } {
  const steps = (key.transforms ?? [])
    .filter((step) => STEPS.includes(step.op))
    .map((step) => ({ key: `site.doctor.mapping.step.${step.op}` as Key, ...(step.value !== undefined && { value: step.value }) }));
  return { system: mappingSystemName(key.system), field: key.field, steps };
}
