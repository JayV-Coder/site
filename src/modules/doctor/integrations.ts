import type { Key } from "@/modules/i18n";

/** As regras de tela das Integrações (Tela 10) e dos Mapas entre sistemas (#40) que não
 * dependem de servidor nem de idioma. */

export const INTEGRATION_SYSTEMS = ["sap", "salesforce", "gcp", "other"] as const;

export function environmentVariant(environment: string): "destructive" | "secondary" | "outline" {
  if (environment === "prd") return "destructive";
  return environment === "hml" ? "secondary" : "outline";
}

/** Os sistemas de uma chave do Mapa: os da Integração mais os middlewares comuns. */
export const MAPPING_SYSTEMS = ["salesforce", "gcp", "sap", "mulesoft", "aws", "azure", "custom"] as const;
const BRANDS: Record<string, string> = {
  salesforce: "Salesforce", gcp: "Google Cloud", sap: "SAP", mulesoft: "MuleSoft", aws: "AWS", azure: "Azure",
};

export function mappingSystemName(system: string): { name: string } | { key: Key } {
  if (system === "custom") return { key: "site.doctor.lane.custom" };
  return { name: BRANDS[system] ?? system };
}

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
    const transforms: Transform[] = [{ op: "trim" }];
    if (row.prefix.trim()) transforms.push({ op: "strip_prefix", value: row.prefix.trim() });
    if (row.zeros) transforms.push({ op: "strip_leading_zeros" });
    if (row.upper) transforms.push({ op: "upper" });
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
