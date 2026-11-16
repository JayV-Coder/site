import type { Key } from "@/modules/i18n";

/** As regras de tela dos Chamados no ITSM (Tela 21): Jira Service Management (#43) e
 * ServiceNow (#44). */

type Variant = "success" | "warning" | "destructive" | "secondary";

export function jiraState(connection: { status: string; project_key: string | null } | null): { key: Key; variant: Variant } {
  if (!connection) return { key: "site.doctor.itsm.state.none", variant: "secondary" };
  if (connection.status === "needs_reauth") return { key: "site.doctor.itsm.state.reauth", variant: "destructive" };
  if (connection.status !== "active" || !connection.project_key) return { key: "site.doctor.itsm.state.noProject", variant: "warning" };
  return { key: "site.doctor.itsm.state.connected", variant: "success" };
}

export function serviceNowState(connection: { status: string } | null): { key: Key; variant: Variant } {
  if (!connection) return { key: "site.doctor.itsm.state.none", variant: "secondary" };
  if (connection.status === "needs_reauth") return { key: "site.doctor.itsm.state.credentials", variant: "destructive" };
  return { key: "site.doctor.itsm.state.connected", variant: "success" };
}

/** Campos customizados com valor fixo, um por linha: `customfield_10010=Sustentação`. */
const FIELD = /^(customfield_[0-9]{1,10})\s*=\s*(.+)$/;

export function parseFields(value: string): { ok: true; fields: Record<string, string> } | { ok: false; line: number } {
  const fields: Record<string, string> = {};
  for (const [index, raw] of value.split("\n").entries()) {
    const line = raw.trim();
    if (!line) continue;
    const [, name, found] = FIELD.exec(line) ?? [];
    if (!name || !found) return { ok: false, line: index + 1 };
    fields[name] = found.trim();
  }
  return { ok: true, fields };
}

export function fieldsText(fields: Record<string, unknown>): string {
  return Object.entries(fields).map(([name, value]) => `${name}=${String(value)}`).join("\n");
}

const PROJECT = /^[A-Za-z][A-Za-z0-9_]{1,19}$/;
export const validProjectKey = (value: string) => PROJECT.test(value.trim());

export const normalizeInstance = (value: string) => value.trim().toLowerCase().replace(/\/+$/, "");
const INSTANCE = /^https:\/\/[a-z0-9][a-z0-9-]{0,62}\.service-now\.com$/;
export const validInstance = (value: string) => INSTANCE.test(normalizeInstance(value));

/** Severidades do Doctor na ordem da tela, para a prioridade do Jira. */
export const PRIORITY_DEFAULTS = { critical: "Highest", high: "High", medium: "Medium", low: "Low" } as const;
