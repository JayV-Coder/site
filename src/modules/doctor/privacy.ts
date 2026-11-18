import type { Key } from "@/modules/i18n";

/** Privacidade e Subprocessadores (PRD §8, ADR-0018): quem trata os dados da Organização, por
 * perfil de IA. Os nomes das empresas ficam como são; a finalidade e a região são texto. */

export const AI_PROFILES = ["standard", "br_region", "dedicated", "local"] as const;
export const aiProfileKey = (profile: string): Key => ((AI_PROFILES as readonly string[]).includes(profile) ? `site.doctor.privacy.profile.${profile}` : "site.doctor.privacy.profile.standard") as Key;

export type Subprocessor = { name: string; purpose: Key; region: Key };

const BASE: Subprocessor[] = [
  { name: "Supabase", purpose: "site.doctor.subprocessors.purpose.supabase", region: "site.doctor.subprocessors.region.supabase" },
  { name: "Google Cloud", purpose: "site.doctor.subprocessors.purpose.gcp", region: "site.doctor.subprocessors.region.brazil" },
];

/** Os subprocessadores que valem para o perfil de IA; no modo local, nenhum de IA recebe nada. */
export function subprocessors(profile: string): Subprocessor[] {
  if (profile === "local") return BASE;
  if (profile !== "standard") {
    return [...BASE, {
      name: "Google Vertex AI",
      purpose: profile === "dedicated" ? "site.doctor.subprocessors.purpose.vertexDedicated" : "site.doctor.subprocessors.purpose.vertex",
      region: "site.doctor.subprocessors.region.brazil",
    }];
  }
  return [
    ...BASE,
    { name: "Anthropic", purpose: "site.doctor.subprocessors.purpose.anthropic", region: "site.doctor.subprocessors.region.us" },
    { name: "Voyage AI", purpose: "site.doctor.subprocessors.purpose.voyage", region: "site.doctor.subprocessors.region.us" },
  ];
}

/** O que o DPA diz sobre a IA em cada perfil. */
export function dpaKey(profile: string): Key {
  if (profile === "local") return "site.doctor.subprocessors.dpa.local";
  return profile === "standard" ? "site.doctor.subprocessors.dpa.standard" : "site.doctor.subprocessors.dpa.brazil";
}

/** Perfis que só a operação da plataforma liga: o Owner pode sair deles, mas não escolhê-los. */
export const CONTRACTED: readonly string[] = ["dedicated", "local"];

export const RETENTION_CLASSES = ["raw_logs", "events", "incidents", "audit"] as const;
export const classKey = (dataClass: string): Key => ((RETENTION_CLASSES as readonly string[]).includes(dataClass) ? `site.doctor.privacy.class.${dataClass}` : "site.doctor.privacy.class.events") as Key;
export const profileDetailKey = (profile: string): Key => `site.doctor.privacy.detail.${(AI_PROFILES as readonly string[]).includes(profile) ? profile : "standard"}` as Key;

/** Os perfis que aparecem: o dedicado e o local só quando já estão ligados (pela operação). */
export function profileOptions(current: string): string[] {
  return CONTRACTED.includes(current) ? [current, "standard", "br_region"] : ["standard", "br_region"];
}

/** Dias inteiros dentro dos limites da classe de dados. */
export function retentionValid(days: number, limits: { min_days: number; max_days: number }): boolean {
  return Number.isInteger(days) && days >= limits.min_days && days <= limits.max_days;
}

/** O que muda ao trocar de perfil, mostrado antes de confirmar. */
export function profileChangeKeys(current: string, next: string): Key[] {
  const keys: Key[] = [next === "standard" ? "site.doctor.privacy.change.standard" : "site.doctor.privacy.change.brazil", "site.doctor.privacy.change.reindex"];
  if (current === "dedicated") keys.push("site.doctor.privacy.change.leaveDedicated");
  if (current === "local") keys.push("site.doctor.privacy.change.leaveLocal");
  return keys;
}

/** Reindexação depois da troca de perfil: `null` quando a Base já está toda no modelo do perfil. */
export function reindexProgress(reindex: { total: number; current: number }): { current: number; total: number } | null {
  return reindex.total === 0 || reindex.current >= reindex.total ? null : { current: reindex.current, total: reindex.total };
}

type AiCheck = { checked_at: string; ok: boolean; in_region: boolean; region: string | null; detail: string | null };

/** A verificação diária do perfil. Falha da chamada de teste (cota, capacidade) não é divergência
 * de região: só `in_region` falso é. */
export function checkStatus(check: AiCheck | null): { ok: boolean; key: Key; region: string | null; detail: string | null } | null {
  if (!check) return null;
  if (check.ok) return { ok: true, key: "site.doctor.privacy.check.ok", region: check.region, detail: null };
  return { ok: false, key: check.in_region ? "site.doctor.privacy.check.noAnswer" : "site.doctor.privacy.check.diverged", region: check.region, detail: check.detail };
}

/** A data em UTC, no formato do idioma. */
export function shortDate(locale: string, iso: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "short", timeZone: "UTC" }).format(new Date(iso));
}
