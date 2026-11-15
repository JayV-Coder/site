import type { Key } from "@/modules/i18n";

/** Os rótulos do Doctor que não dependem de servidor nem de idioma: códigos, idades,
 * permissões e as chaves de tradução de cada valor da API. O texto sai pelo `t()` de
 * quem desenha. */

export const ROLES = ["owner", "admin", "analyst", "viewer"] as const;
export const SEVERITIES = ["critical", "high", "medium", "low"] as const;
export const STATUSES = ["open", "investigating", "resolved", "dismissed"] as const;
export const ENVIRONMENTS = ["prd", "hml", "dev"] as const;
export const PERIODS = ["24h", "7d", "30d"] as const;
export const CATEGORIES = [
  "TIMEOUT", "AUTH", "RATE_LIMIT", "VALIDATION", "BUSINESS_REJECTION", "DUPLICATE", "PENDING_CONFIRMATION",
  "DIVERGENCE", "SAP_LOCK", "IDOC_ERROR", "SAP_AUTHORIZATION", "MASTER_DATA", "UNCLASSIFIED",
] as const;

function keyOf<T extends string>(known: readonly T[], prefix: string, value: string): Key | null {
  return (known as readonly string[]).includes(value) ? (`${prefix}.${value}` as Key) : null;
}

/** A chave do rótulo, ou nulo para um valor que o site ainda não conhece (aí vale o valor). */
export const roleKey = (role: string) => keyOf(ROLES, "site.doctor.role", role);
export const severityKey = (severity: string) => keyOf(SEVERITIES, "site.doctor.severity", severity);
export const statusKey = (status: string) => keyOf(STATUSES, "site.doctor.status", status);
export const environmentKey = (environment: string) => keyOf(ENVIRONMENTS, "site.doctor.env", environment);
export const categoryKey = (category: string) => keyOf(CATEGORIES, "site.doctor.category", category);

/** A cor do selo pela Severidade; o texto sempre acompanha. */
export function severityVariant(severity: string): "destructive" | "warning" | "secondary" {
  if (severity === "critical" || severity === "high") return "destructive";
  return severity === "medium" ? "warning" : "secondary";
}

export function incidentCode(number: number): string {
  return `INC-${String(number).padStart(4, "0")}`;
}

/** Há quanto tempo, na maior unidade que cabe. */
export function ageParts(iso: string, now: Date): { unit: "minutes" | "hours" | "days"; count: number } {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return { unit: "minutes", count: minutes };
  if (minutes < 48 * 60) return { unit: "hours", count: Math.floor(minutes / 60) };
  return { unit: "days", count: Math.floor(minutes / (24 * 60)) };
}

export function mttrParts(minutes: number | null | undefined): { minutes: number } | { hours: number; minutes: string } | null {
  if (minutes === null || minutes === undefined) return null;
  const rounded = Math.round(minutes);
  if (rounded < 60) return { minutes: rounded };
  return { hours: Math.floor(rounded / 60), minutes: String(rounded % 60).padStart(2, "0") };
}

/** A seta diz a direção e o texto diz o quanto: a cor nunca é a única pista. */
export function changeArrow(change: number): "▲" | "▼" | "=" {
  return change > 0 ? "▲" : change < 0 ? "▼" : "=";
}

export function bucketLabel(iso: string, bucket: "hour" | "day"): string {
  const date = new Date(iso);
  if (bucket === "hour") return `${date.getUTCHours()}h`;
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function peak<T extends { failed: number }>(buckets: T[]): T | null {
  return buckets.reduce<T | null>((best, item) => (item.failed > (best?.failed ?? 0) ? item : best), null);
}

const MANAGER_ROLES = ["owner", "admin"];

/** Owner e Admin administram a Organização. */
export function isManager(role: string | null | undefined): boolean {
  return role != null && MANAGER_ROLES.includes(role);
}

/** Ações de escrita: Owner ou Admin com MFA (`aal2`), a mesma regra que a API confere. Sem
 * `aal2`, o botão só levaria a um erro no fim. */
export function canManage(me: { active_role?: string | null; aal?: string | null } | null | undefined): boolean {
  return isManager(me?.active_role) && me?.aal === "aal2";
}

export const SLUG_MAX = 40;

function plain(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function matchesSearch(name: string, query: string): boolean {
  return plain(name).includes(plain(query.trim()));
}

/** Sugestão de identificador; a regra final é a do banco (`public.organizations.slug`). */
export function slugify(name: string): string {
  return plain(name).replace(/[^a-z0-9]+/g, "-").slice(0, SLUG_MAX).replace(/^-+|-+$/g, "");
}

export function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join("");
}

export type IncidentStatus = (typeof STATUSES)[number];

/** Espelho de `doctor.check_incident_transition`: a tela só oferece o que o banco aceita. */
export const NEXT_STATUSES: Record<IncidentStatus, IncidentStatus[]> = {
  open: ["investigating", "resolved", "dismissed"],
  investigating: ["open", "resolved", "dismissed"],
  resolved: ["open"],
  dismissed: ["open"],
};

export const EXECUTION_STATUSES = ["failed", "success", "pending_confirmation", "unknown"] as const;
export const executionStatusKey = (status: string) => keyOf(EXECUTION_STATUSES, "site.doctor.execution.status", status);

export function executionStatusVariant(status: string): "destructive" | "success" | "warning" | "secondary" {
  if (status === "failed") return "destructive";
  if (status === "success") return "success";
  return status === "pending_confirmation" ? "warning" : "secondary";
}

export function durationParts(ms: number):
  { unit: "ms"; value: number } | { unit: "s"; value: number } | { unit: "min"; minutes: number; seconds: number } {
  if (ms < 1000) return { unit: "ms", value: ms };
  if (ms < 60_000) return { unit: "s", value: Math.floor(ms / 100) / 10 };
  const seconds = Math.round(ms / 1000);
  return { unit: "min", minutes: Math.floor(seconds / 60), seconds: seconds % 60 };
}

/** O nome da Execução pelos identificadores que a correlação achou; nulo sem eles (a tela usa
 * "Execução" + o começo do id). */
export function executionTitle(_id: string, keys: Record<string, string[] | undefined>): string | null {
  const parts = [keys.execution_id?.[0], keys.trace_id?.[0]].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}
