/** O log de auditoria da organização (`org_audit`): um pedido por linha, com
 * quem pediu, o agente, os comandos e o resultado da validação. Sem o texto
 * do pedido. Vira CSV ou JSON para baixar. */

type Row = Record<string, unknown>;

export interface AuditRow {
  at: string;
  turnId: string;
  chatId: string;
  userId: string;
  member: string;
  project: string;
  status: string;
  gate: string;
  agent: string;
  model: string;
  mode: string;
  commands: string[];
  tools: string[];
  validation: string;
  repairs: number;
  tokens: number;
  costUsd: number | null;
}

const text = (value: unknown) => (typeof value === "string" ? value : "");
const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item !== "") : []);
const number = (value: unknown) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; };

export function auditRowsOf(data: unknown): AuditRow[] {
  return (Array.isArray(data) ? data : []).filter((item): item is Row => !!item && typeof item === "object").map((row) => ({
    at: text(row.at),
    turnId: text(row.turn_id),
    chatId: text(row.chat_id),
    userId: text(row.user_id),
    member: text(row.member),
    project: text(row.project),
    status: text(row.status),
    gate: text(row.gate),
    agent: text(row.agent),
    model: text(row.model),
    mode: text(row.mode),
    commands: strings(row.commands),
    tools: strings(row.tools),
    validation: text(row.validation),
    repairs: number(row.repairs),
    tokens: number(row.tokens),
    costUsd: row.cost_usd === null || row.cost_usd === undefined ? null : number(row.cost_usd),
  }));
}

export const AUDIT_COLUMNS = ["at", "member", "project", "gate", "agent", "model", "mode", "commands", "tools", "validation", "repairs", "tokens", "costUsd", "status", "userId", "chatId", "turnId"] as const;

/** Um campo do CSV: aspas quando precisa, e a fórmula desarmada (um texto que
 * começa com `=`, `+`, `-` ou `@` vira texto no Excel). */
function cell(value: string | number | null): string {
  if (value === null) return "";
  let raw = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(raw)) raw = `'${raw}`;
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export function auditCsv(rows: AuditRow[]): string {
  const lines = [AUDIT_COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(AUDIT_COLUMNS.map((column) => {
      const value = row[column];
      return cell(Array.isArray(value) ? value.join(" | ") : value);
    }).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const AUDIT_MAX_DAYS = 366;

/** O período pedido, ou nulo quando não vale (formato, ordem, mais de um ano). */
export function auditRange(from: string | null, to: string | null): { from: string; to: string } | null {
  if (!from || !to || !DAY.test(from) || !DAY.test(to)) return null;
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || (end - start) / 86_400_000 > AUDIT_MAX_DAYS) return null;
  return { from, to };
}

/** Os últimos 30 dias, para o formulário começar preenchido. */
export function lastDays(days: number, today = new Date()): { from: string; to: string } {
  const to = today.toISOString().slice(0, 10);
  const from = new Date(today.getTime() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  return { from, to };
}
