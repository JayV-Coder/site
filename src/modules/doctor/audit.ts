import type { Key } from "@/modules/i18n";

/** As regras de tela da Trilha de auditoria (Tela 18). */

export const AUDIT_CATEGORIES = ["security", "diagnosis", "connectors", "data", "incidents"] as const;
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

/** O termo de busca que a API aceita (`AuditSearch.q`): mais que isso, ela recusa. */
export const AUDIT_TERM_MAX = 200;

export function readCategory(value: unknown): AuditCategory | null {
  return typeof value === "string" && (AUDIT_CATEGORIES as readonly string[]).includes(value) ? (value as AuditCategory) : null;
}

type Entry = {
  action: string; actor_type: string; actor_label: string | null;
  before: Record<string, unknown> | null; after: Record<string, unknown> | null;
};

/** As ações que a tela descreve; a chave de texto é a ação com `.` trocado por `_`. */
const KNOWN = new Set([
  "membership.created", "membership.deleted", "membership.updated", "invitation.created", "invitation.updated", "invitation.deleted",
  "integration.created", "integration.updated", "integration.deleted", "connector.created", "connector.updated", "connector.deleted",
  "connector.create", "connector.update", "connector.pause", "connector.resume", "connector.secret.update", "vault.secret_read",
  "org.updated", "org.switched", "auth.login", "auth.logout", "auth.mfa_verified", "auth.mfa_enrolling", "auth.mfa_enrolled",
  "auth.mfa_removed", "auth.password_changed", "auth.recovery_requested", "diagnosis.requested", "diagnosis.reviewed",
  "diagnosis.auto_changed", "incident.update", "raw_log.downloaded", "knowledge.deleted", "knowledge.promoted", "audit.exported",
]);
/** Sinônimos que a plataforma grava com dois nomes. */
const ALIASES: Record<string, string> = { "connector.create": "connector.created", "connector.update": "connector.updated" };

export type Described = { key: Key; params?: Record<string, string | number> } | { text: string };

export function describeEntry(entry: Entry): Described {
  if (entry.action === "membership.role_changed") {
    const role = (value: unknown) => (typeof value === "string" ? value : "—");
    return { key: "site.doctor.audit.action.role_changed", params: { from: role(entry.before?.role), to: role(entry.after?.role) } };
  }
  if (entry.action === "diagnosis.reviewed" && typeof entry.after?.verdict === "string" && ["accepted", "corrected", "rejected"].includes(entry.after.verdict)) {
    const version = typeof entry.after.version === "number" ? entry.after.version : "—";
    return { key: `site.doctor.audit.action.reviewed_${entry.after.verdict}` as Key, params: { version } };
  }
  if (!KNOWN.has(entry.action)) return { text: entry.action };
  const action = ALIASES[entry.action] ?? entry.action;
  return { key: `site.doctor.audit.action.${action.replaceAll(".", "_")}` as Key };
}

export function actorOf(entry: Pick<Entry, "actor_type" | "actor_label">): { key: Key } | { text: string } {
  if (entry.actor_type === "system") return { key: "site.doctor.audit.actor.system" };
  if (entry.actor_type === "worker") return { key: "site.doctor.audit.actor.worker" };
  return entry.actor_label ? { text: entry.actor_label } : { key: "site.doctor.audit.actor.removed" };
}

/** Mudança de acesso e de credencial em destaque; revisão humana e promoção em verde. */
const SERIOUS = ["membership.", "invitation.deleted", "connector.secret", "vault.", "org.updated"];

export function auditTone(action: string): "serious" | "good" | "neutral" {
  if (action === "diagnosis.reviewed" || action === "knowledge.promoted") return "good";
  return SERIOUS.some((prefix) => action.startsWith(prefix)) ? "serious" : "neutral";
}
