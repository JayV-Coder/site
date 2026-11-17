import type { Key, Params } from "@/modules/i18n";

/** Uso e Cotas (Tela 17): as regras de tela, sem React, para testar. */

export const RESOURCES = ["events_ingested", "diagnoses_llm", "storage_bytes", "connectors_active", "members"] as const;
export const PLANS = ["pilot", "professional", "enterprise"] as const;

export const resourceKey = (resource: string): Key | null => (RESOURCES as readonly string[]).includes(resource) ? (`site.doctor.usage.resource.${resource}` as Key) : null;
export const planKey = (plan: string): Key | null => (PLANS as readonly string[]).includes(plan) ? (`site.doctor.usage.plan.${plan}` as Key) : null;

/** Quantidade curta no idioma de quem lê (mil, mi...); armazenamento em GB. */
export function amountText(locale: string, resource: string, value: number): string {
  if (resource === "storage_bytes") return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value / 1e9)} GB`;
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/** O que a barra mostra: 0 a 100, nunca além. */
export const percentOf = (ratio: number): number => Math.min(100, Math.max(0, Math.round(ratio * 100)));

export type MeterTone = "ok" | "warning" | "danger";
export const meterTone = (ratio: number): MeterTone => (ratio >= 1 ? "danger" : ratio >= 0.8 ? "warning" : "ok");

/** Aviso aos 80% e quando a Cota acaba, com o efeito no produto; `null` abaixo disso. */
export function quotaWarning(resource: string, ratio: number, tolerance = 1.1): { key: Key; params?: Params } | null {
  if (ratio >= 1) {
    if (resource === "diagnoses_llm") return { key: "site.doctor.usage.warn.llmExhausted" };
    if (resource === "events_ingested") return { key: "site.doctor.usage.warn.eventsExhausted", params: { percent: Math.round(tolerance * 100) } };
    if (resource === "storage_bytes") return { key: "site.doctor.usage.warn.storage" };
    return { key: "site.doctor.usage.warn.limit" };
  }
  if (ratio >= 0.8) {
    const percent = Math.round(ratio * 100);
    return { key: resource === "diagnoses_llm" ? "site.doctor.usage.warn.percentLlm" : "site.doctor.usage.warn.percent", params: { percent } };
  }
  return null;
}
