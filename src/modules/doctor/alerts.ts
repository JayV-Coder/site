import type { Key, Params, Text } from "@/modules/i18n";

/** Alertas (Tela 20) e Webhooks de saída: as regras de tela, sem React, para testar. */

export const SEVERITIES = ["critical", "high", "medium", "low"] as const;
export const RULE_TYPES = ["incident", "error_rate", "connector_failing", "diagnosis_review"] as const;
export const CHANNEL_KINDS = ["webpush", "email", "slack", "teams", "jira", "servicenow"] as const;
export const WEBHOOK_EVENTS = ["incident.opened", "incident.updated", "incident.resolved", "diagnosis.published", "diagnosis.reviewed"] as const;

type Conditions = Record<string, unknown>;
const list = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);
const known = <T extends string>(options: readonly T[], value: unknown): T | null => options.find((option) => option === value) ?? null;

export type RuleDraft = {
  name: string; type: string; severity: string; environments: string[]; threshold: string; minutes: string;
  channels: string[]; quietStart: string; quietEnd: string;
};
export const EMPTY_RULE: RuleDraft = {
  name: "", type: "incident", severity: "critical", environments: [], threshold: "5", minutes: "10", channels: [], quietStart: "", quietEnd: "",
};

/** O número do campo, ou o padrão quando vazio ou inválido (a API confere os limites). */
function amount(value: string, fallback: number): number {
  const parsed = Number(value.trim());
  return value.trim() !== "" && Number.isFinite(parsed) ? parsed : fallback;
}

/** As condições que a API guarda, a partir do formulário: só o que o tipo da regra usa. */
export function ruleConditions(draft: RuleDraft): Conditions {
  switch (draft.type) {
    case "incident":
      return { type: "incident", min_severity: known(SEVERITIES, draft.severity) ?? "high", environments: draft.environments };
    case "error_rate":
      return { type: "error_rate", threshold_pct: amount(draft.threshold, 5), minutes: amount(draft.minutes, 10) };
    case "diagnosis_review":
      return { type: "diagnosis_review", minutes: amount(draft.minutes, 30) };
    default:
      return { type: "connector_failing" };
  }
}

/** O silêncio só vale com os dois horários; o fuso é o do Brasil, como no app antigo. */
export function quietHours(start: string, end: string): { start: string; end: string; timezone: string } | null {
  return start && end ? { start, end, timezone: "America/Sao_Paulo" } : null;
}

/** Da API (`quiet_hours` livre) para os dois horários que a tela mostra. */
export function toQuiet(raw: Record<string, unknown> | null | undefined): { start: string; end: string } | null {
  const start = raw?.start;
  const end = raw?.end;
  return typeof start === "string" && typeof end === "string" ? { start, end } : null;
}

export const ruleTypeKey = (type: unknown): Key | null => {
  const found = known(RULE_TYPES, type);
  return found ? (`site.doctor.alerts.type.${found}` as Key) : null;
};

/** "Quando" da regra, como texto para traduzir; os nomes de Ambiente e Integração vêm prontos. */
export function ruleWhen(
  conditions: Conditions,
  integrations: { id: string; name: string }[],
  words: { environment: (value: string) => string; allEnvironments: string; allIntegrations: string; integration: string; severity: (value: string) => string },
): Text {
  switch (conditions.type) {
    case "incident": {
      const environments = list(conditions.environments).map(words.environment);
      return {
        key: "site.doctor.alerts.when.incident",
        params: { severity: words.severity(String(conditions.min_severity)), environments: environments.length > 0 ? environments.join(", ") : words.allEnvironments },
      };
    }
    case "error_rate": {
      const names = list(conditions.integrations).map((id) => integrations.find((item) => item.id === id)?.name ?? words.integration);
      return {
        key: "site.doctor.alerts.when.errorRate",
        params: { threshold: String(conditions.threshold_pct), minutes: String(conditions.minutes), scope: names.length > 0 ? names.join(", ") : words.allIntegrations },
      };
    }
    case "connector_failing":
      return { key: "site.doctor.alerts.when.connector" };
    default:
      return { key: "site.doctor.alerts.when.review", params: { minutes: String(conditions.minutes) } };
  }
}

/** Os tipos de canal que a regra usa, sem repetir e na ordem da lista. */
export function ruleChannelKinds(ids: string[], channels: { id: string; type: string }[]): string[] {
  const kinds = new Set(ids.flatMap((id) => channels.find((item) => item.id === id)?.type ?? []));
  return CHANNEL_KINDS.filter((kind) => kinds.has(kind));
}

/** `applicationServerKey` do PushManager: a chave pública VAPID em base64url, como bytes. */
export function applicationServerKey(key: string): Uint8Array<ArrayBuffer> {
  const padded = key.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (key.length % 4)) % 4);
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

export type Variant = "success" | "warning" | "destructive" | "secondary";
type State = { key: Key; params?: Params; variant: Variant };

export function webhookState(hook: { enabled: boolean; failure_count: number }): State {
  if (!hook.enabled) return { key: "site.doctor.webhooks.state.off", variant: "destructive" };
  if (hook.failure_count > 0) return { key: "site.doctor.webhooks.state.failing", params: { count: hook.failure_count }, variant: "warning" };
  return { key: "site.doctor.webhooks.state.active", variant: "success" };
}

export function deliveryState(delivery: { status: string; response_status: number | null }): State {
  const http = delivery.response_status ? `HTTP ${String(delivery.response_status)}` : null;
  switch (delivery.status) {
    case "succeeded":
      return http ? { key: "site.doctor.webhooks.delivery.http", params: { http }, variant: "success" } : { key: "site.doctor.webhooks.delivery.delivered", variant: "success" };
    case "abandoned":
      return { key: "site.doctor.webhooks.delivery.abandoned", variant: "destructive" };
    case "pending":
      return http ? { key: "site.doctor.webhooks.delivery.retrying", params: { http }, variant: "warning" } : { key: "site.doctor.webhooks.delivery.queued", variant: "secondary" };
    default:
      return http ? { key: "site.doctor.webhooks.delivery.http", params: { http }, variant: "destructive" } : { key: "site.doctor.webhooks.delivery.failed", variant: "destructive" };
  }
}

export const eventKey = (event: string): Key | null => {
  const found = known(WEBHOOK_EVENTS, event);
  return found ? (`site.doctor.webhooks.event.${found}` as Key) : null;
};
