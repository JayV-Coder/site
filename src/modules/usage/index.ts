/** O que o banco devolve sobre uso e custo (app 0.110.0): a tabela de preços
 * por modelo, o custo do Jev por plano (`admin_jev_costs`), o uso de cada
 * recurso (`admin_feature_usage`) e o uso da equipe por semana (`org_usage`).
 * Só leitura e conversão; quem grava são as RPCs do admin. */

type Row = Record<string, unknown>;

const num = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};
const maybe = (value: unknown): number | null => (value === null || value === undefined || value === "" ? null : num(value));
const rows = (value: unknown): Row[] => (Array.isArray(value) ? value.filter((item): item is Row => !!item && typeof item === "object") : []);
const text = (value: unknown) => (typeof value === "string" ? value : "");

/** Um preço da tabela: dólares por milhão de tokens. Sem preço de cache, o
 * banco usa um décimo (leitura) e 1,25× (escrita) do preço de entrada. */
export interface ModelPrice {
  pattern: string;
  inputUsd: number;
  outputUsd: number;
  cacheReadUsd: number | null;
  cacheWriteUsd: number | null;
}

export const modelPricesOf = (data: unknown): ModelPrice[] => rows(data)
  .map((row) => ({
    pattern: text(row.pattern),
    inputUsd: num(row.input_usd),
    outputUsd: num(row.output_usd),
    cacheReadUsd: maybe(row.cache_read_usd),
    cacheWriteUsd: maybe(row.cache_write_usd),
  }))
  .filter((price) => price.pattern)
  .sort((a, b) => a.pattern.localeCompare(b.pattern));

/** O que o formulário digitou, já como número; nulo quando um campo não vale. */
export function parsePrice(draft: { pattern: string; inputUsd: string; outputUsd: string; cacheReadUsd: string; cacheWriteUsd: string }): ModelPrice | null {
  const pattern = draft.pattern.trim().toLowerCase();
  const amount = (value: string, optional: boolean): number | null | undefined => {
    const clean = value.trim().replace(",", ".");
    if (clean === "") return optional ? null : undefined;
    const parsed = Number(clean);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  };
  const inputUsd = amount(draft.inputUsd, false);
  const outputUsd = amount(draft.outputUsd, false);
  const cacheReadUsd = amount(draft.cacheReadUsd, true);
  const cacheWriteUsd = amount(draft.cacheWriteUsd, true);
  if (!pattern || pattern.length > 80 || inputUsd == null || outputUsd == null || cacheReadUsd === undefined || cacheWriteUsd === undefined) return null;
  return { pattern, inputUsd, outputUsd, cacheReadUsd, cacheWriteUsd };
}

export interface JevPlanCost {
  plan: string;
  users: number;
  calls: number;
  requests: number;
  tokens: number;
  /** Nulo quando nenhuma chamada tem preço (nem informado, nem na tabela). */
  costUsd: number | null;
  unpricedCalls: number;
  costPerUser: number | null;
  requestsPerUserDay: number | null;
}

export interface JevTopUser { userId: string; email: string; plan: string; calls: number; requests: number; tokens: number; costUsd: number | null }

export interface JevCosts { days: number; plans: JevPlanCost[]; top: JevTopUser[] }

export function jevCostsOf(data: unknown): JevCosts {
  const value = (data && typeof data === "object" ? data : {}) as Row;
  return {
    days: num(value.days) || 30,
    plans: rows(value.plans).map((row) => ({
      plan: text(row.plan),
      users: num(row.users),
      calls: num(row.calls),
      requests: num(row.requests),
      tokens: num(row.tokens),
      costUsd: maybe(row.cost_usd),
      unpricedCalls: num(row.unpriced_calls),
      costPerUser: maybe(row.cost_per_user),
      requestsPerUserDay: maybe(row.requests_per_user_day),
    })),
    top: rows(value.top).map((row) => ({
      userId: text(row.user_id),
      email: text(row.email),
      plan: text(row.plan),
      calls: num(row.calls),
      requests: num(row.requests),
      tokens: num(row.tokens),
      costUsd: maybe(row.cost_usd),
    })),
  };
}

export interface FeatureUse {
  feature: string;
  enabled: boolean;
  /** Falso: o app ainda não mede o recurso, então o zero não quer dizer nada. */
  measured: boolean;
  users30: number;
  users60: number;
  uses30: number;
  uses60: number;
}

export interface FeatureUsage { consenting: number; features: FeatureUse[] }

export function featureUsageOf(data: unknown): FeatureUsage {
  const value = (data && typeof data === "object" ? data : {}) as Row;
  return {
    consenting: num(value.consenting),
    features: rows(value.features).map((row) => ({
      feature: text(row.feature),
      enabled: row.enabled !== false,
      measured: row.measured === true,
      users30: num(row.users_30),
      users60: num(row.users_60),
      uses30: num(row.uses_30),
      uses60: num(row.uses_60),
    })),
  };
}

/** Os recursos medidos que ninguém usou em 60 dias: candidatos a sair ou a
 * virar opcionais (roadmap, item 2.6). Só conta com quem aceitou medir. */
export const unusedFeatures = (usage: FeatureUsage) => (usage.consenting === 0 ? [] : usage.features.filter((item) => item.measured && item.uses60 === 0));

export interface UsageWeek {
  /** Segunda-feira da semana, `AAAA-MM-DD`. */
  week: string;
  requests: number;
  objectives: number;
  members: number;
  verified: number;
  failed: number;
  unproven: number;
  tokens: number;
  reportedUsd: number;
  costUsd: number;
  unpricedCalls: number;
}

export interface MemberUsage { userId: string; name: string; requests: number; verified: number; tokens: number; costUsd: number }

export interface OrgUsage { weeks: number; series: UsageWeek[]; members: MemberUsage[] }

export function orgUsageOf(data: unknown): OrgUsage {
  const value = (data && typeof data === "object" ? data : {}) as Row;
  return {
    weeks: num(value.weeks) || 8,
    series: rows(value.series).map((row) => ({
      week: text(row.week),
      requests: num(row.requests),
      objectives: num(row.objectives),
      members: num(row.members),
      verified: num(row.verified),
      failed: num(row.failed),
      unproven: num(row.unproven),
      tokens: num(row.tokens),
      reportedUsd: num(row.reported_usd),
      costUsd: num(row.cost_usd),
      unpricedCalls: num(row.unpriced_calls),
    })),
    members: rows(value.members).map((row) => ({
      userId: text(row.user_id),
      name: text(row.name),
      requests: num(row.requests),
      verified: num(row.verified),
      tokens: num(row.tokens),
      costUsd: num(row.cost_usd),
    })).sort((a, b) => b.costUsd - a.costUsd || b.requests - a.requests),
  };
}

/** Os totais do período: o painel mostra estes números no topo. */
export function usageTotals(usage: OrgUsage) {
  const sum = (pick: (week: UsageWeek) => number) => usage.series.reduce((total, week) => total + pick(week), 0);
  const verified = sum((week) => week.verified);
  const requests = sum((week) => week.requests);
  const objectives = sum((week) => week.objectives);
  const costUsd = sum((week) => week.costUsd);
  const tokens = sum((week) => week.tokens);
  return {
    requests,
    objectives,
    verified,
    failed: sum((week) => week.failed),
    unproven: sum((week) => week.unproven),
    tokens,
    costUsd,
    unpricedCalls: sum((week) => week.unpricedCalls),
    turnsPerObjective: objectives ? requests / objectives : null,
    costPerVerified: verified ? costUsd / verified : null,
    tokensPerVerified: verified ? tokens / verified : null,
  };
}

/** Dólares como a tela escreve; centavos de dólar abaixo de um dólar. */
export const formatUsd = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: value !== 0 && Math.abs(value) < 1 ? 4 : 2 }).format(value);

export const formatCount = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, { notation: value >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
