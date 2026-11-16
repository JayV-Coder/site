import type { Key } from "@/modules/i18n";
import { ENVIRONMENTS, EXECUTION_STATUSES } from "./labels";

/** As regras de tela das Execuções (Tela 7), da Timeline (Tela 8) e do Evento original (Tela 9)
 * que não dependem de servidor nem de idioma. */

/** Filtros que podem ir no endereço (nada sensível). O termo de busca (`q`) nunca vai: pode ser
 * um número de pedido. */
export interface ExecutionFilters {
  status?: string;
  integration?: string;
  environment?: string;
  period?: string;
}

export const PERIOD_HOURS = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 } as const;
export const PAGE_SIZE = 25;
const FILTER_KEYS = ["status", "integration", "environment", "period"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readExecutionFilters(params: Record<string, string | string[] | undefined>): ExecutionFilters {
  const one = (key: string) => (typeof params[key] === "string" ? params[key] : undefined);
  const filters: ExecutionFilters = {};
  const status = one("status");
  const integration = one("integration");
  const environment = one("environment");
  const period = one("period");
  if (status && (EXECUTION_STATUSES as readonly string[]).includes(status)) filters.status = status;
  if (integration && UUID.test(integration)) filters.integration = integration;
  if (environment && (ENVIRONMENTS as readonly string[]).includes(environment)) filters.environment = environment;
  if (period && Object.hasOwn(PERIOD_HOURS, period)) filters.period = period;
  return filters;
}

/** `now` é o instante da primeira página: as seguintes repetem o mesmo início, senão "Carregar
 * mais" pularia o que chegou entre uma e outra. */
export function toExecutionSearch(filters: ExecutionFilters, now: Date) {
  const hours = filters.period ? PERIOD_HOURS[filters.period as keyof typeof PERIOD_HOURS] : undefined;
  return {
    status: filters.status ?? null,
    integration_id: filters.integration ?? null,
    environment: filters.environment ?? null,
    from: hours ? new Date(now.getTime() - hours * 3_600_000).toISOString() : null,
    limit: PAGE_SIZE,
  };
}

/** O link de um filtro rápido: liga ou desliga um filtro, mantendo os outros. */
export function filtersHref(base: string, filters: ExecutionFilters, key: keyof ExecutionFilters, value: string): string {
  const next: ExecutionFilters = { ...filters, [key]: filters[key] === value ? undefined : value };
  const query = new URLSearchParams();
  for (const name of FILTER_KEYS) {
    const current = next[name];
    if (current) query.set(name, current);
  }
  const text = query.toString();
  return text ? `${base}?${text}` : base;
}

/** Raias da Timeline por sistema (#40): uma Execução que passa por Salesforce, middleware e SAP
 * mostra cada Evento na raia do sistema de onde veio (`source.provider`). As marcas não se
 * traduzem; Importação e Outros sim. */
export type Lane = { system: string; short: string } & ({ name: string } | { key: Key });

const KNOWN: Lane[] = [
  { system: "salesforce", name: "Salesforce", short: "SF" },
  { system: "gcp", name: "Google Cloud", short: "GCP" },
  { system: "mulesoft", name: "MuleSoft", short: "Mule" },
  { system: "aws", name: "AWS", short: "AWS" },
  { system: "azure", name: "Azure", short: "Az" },
  { system: "sap", name: "SAP", short: "SAP" },
  { system: "manual", key: "site.doctor.lane.manual", short: "Imp" },
  { system: "custom", key: "site.doctor.lane.custom", short: "Out" },
];

export function laneOf(event: { source: Record<string, unknown> }): string {
  const provider = event.source.provider;
  return typeof provider === "string" && provider ? provider : "custom";
}

export function lanes(events: readonly { source: Record<string, unknown> }[]): Lane[] {
  const present = new Set(events.map(laneOf));
  const known = KNOWN.filter((lane) => present.has(lane.system));
  const other = [...present]
    .filter((system) => !KNOWN.some((lane) => lane.system === system))
    .sort()
    .map((system) => ({ system, name: system, short: system.slice(0, 4) }));
  return [...known, ...other];
}

/** A chave guardada é `<id do Mapa>:<valor>`; a tela mostra só os valores, sem repetir. */
export function crossKeysText(keys: readonly string[]): string {
  return [...new Set(keys.map((key) => key.slice(key.indexOf(":") + 1)))].join(", ");
}

const STRATEGIES = ["execution_id", "trace_id", "cross_system", "business_reference", "temporal_proximity"];

export function correlationKey(strategy: string | null): Key {
  if (!strategy) return "site.doctor.correlation.none";
  return (STRATEGIES.includes(strategy) ? `site.doctor.correlation.${strategy}` : "site.doctor.correlation.other") as Key;
}

export function eventSeverityVariant(severity: string): "destructive" | "warning" | "secondary" {
  if (severity === "ERROR" || severity === "CRITICAL") return "destructive";
  return severity === "WARNING" ? "warning" : "secondary";
}

function text(value: unknown): string | null {
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

/** "sap-order-sync" ou, sem serviço, o provedor: de onde o Evento veio, em uma palavra. */
export function eventSource(source: Record<string, unknown>): string | null {
  return text(source.service) ?? text(source.provider);
}

export function errorSummary(error: Record<string, unknown> | null | undefined): string | null {
  if (!error) return null;
  const status = text(error.http_status);
  const parts = [status && `HTTP ${status}`, text(error.category)].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

/** O que cada detector da Sanitização (packages/security) tira. Um tipo que a tela não conhece
 * é uma regra própria da Organização (#13) e aparece pelo nome que ela deu. */
const KINDS = [
  "bearer", "jwt", "token", "authorization", "cookie", "password", "private_key", "salesforce_session", "aws_key", "gcp_key",
  "gcp_token", "cpf", "cnpj", "email", "telefone", "cartao", "ip",
];

export type SanitizationItem = { key: Key; count: number; kind?: string };

export function sanitizationItems(report: { counts?: unknown; truncated?: unknown } | null | undefined): {
  items: SanitizationItem[]; references: number; truncated: boolean;
} {
  const counts = (report?.counts && typeof report.counts === "object" ? report.counts : {}) as Record<string, unknown>;
  const items: SanitizationItem[] = [];
  for (const [kind, raw] of Object.entries(counts)) {
    const count = typeof raw === "number" ? raw : 0;
    if (kind === "referencia" || count <= 0) continue;
    items.push(KINDS.includes(kind) ? { key: `site.doctor.sanitized.${kind}` as Key, count } : { key: "site.doctor.sanitized.custom", count, kind });
  }
  const references = typeof counts.referencia === "number" ? counts.referencia : 0;
  return { items, references, truncated: report?.truncated === true };
}

export type JsonToken = { kind: "plain" | "key" | "string" | "number" | "literal" | "redacted"; text: string };

const TOKEN = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g;
/** A marca que a Sanitização põe no lugar do dado (`packages/security`). */
const REDACTED = "[REMOVIDO:";

/** Realce simples para a Tela 9: o JSON vem do próprio `JSON.stringify`, então a gramática é a
 * dele. O que a Sanitização trocou fica marcado. */
export function highlightJson(value: unknown): JsonToken[] {
  const source = JSON.stringify(value, null, 2);
  const tokens: JsonToken[] = [];
  let last = 0;
  const plain = (chunk: string) => {
    if (!chunk) return;
    const previous = tokens.at(-1);
    if (previous?.kind === "plain") previous.text += chunk;
    else tokens.push({ kind: "plain", text: chunk });
  };
  for (const match of source.matchAll(TOKEN)) {
    plain(source.slice(last, match.index));
    const [whole, quoted, colon, number, literal] = match;
    if (quoted !== undefined && colon !== undefined) {
      tokens.push({ kind: "key", text: quoted });
      plain(colon);
    } else if (quoted !== undefined) {
      tokens.push({ kind: quoted.includes(REDACTED) ? "redacted" : "string", text: quoted });
    } else if (number !== undefined) {
      tokens.push({ kind: "number", text: number });
    } else if (literal !== undefined) {
      tokens.push({ kind: "literal", text: literal });
    }
    last = match.index + whole.length;
  }
  plain(source.slice(last));
  return tokens;
}
