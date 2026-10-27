/** Os recursos que o admin do sistema liga, desliga e põe nos planos. A
 * mesma lista do app (`src/modules/plans/catalog.ts` do jayv-coder) e da
 * migração dos planos (`public.features`); o texto de cada um vem do i18n
 * (`feature.<chave>.title` / `.detail`). Um recurso de uma versão mais nova do
 * app, que o site ainda não conhece, fica de fora da lista. */
export const FEATURES = [
  "organizations",
  "orgChat",
  "stats",
  "gateBoard",
  "liveFiles",
  "chatSearch",
  "projectNotes",
  "adaptiveRouting",
  "secondOpinion",
  "planFirst",
  "parallelTasks",
  "entryGate",
  "exitGate",
  "secretRedaction",
  "sensitiveFiles",
  "agentSessions",
  "contextCache",
  "answerRecall",
  "leanCode",
  "symbolIndex",
  "mcp",
  "skills",
  "skillsHub",
  "kiloCode",
  "gatewayProviders",
  "conversationFind",
  "customMods",
  "keepSessionModel",
  "limitResume",
  "planBuildSession",
  "autoTurnCeiling",
] as const;

export type FeatureKey = (typeof FEATURES)[number];

export const isFeature = (key: string): key is FeatureKey => (FEATURES as readonly string[]).includes(key);

/** O núcleo: o que um plano novo já traz, travado. É só o ponto de partida: o
 * admin pode tirar, deixar opcional ou desligar qualquer um. A mesma lista da
 * migração `core_features` (`features.core`). */
export const CORE_FEATURES: readonly FeatureKey[] = ["entryGate", "exitGate", "secretRedaction", "sensitiveFiles", "agentSessions", "contextCache", "adaptiveRouting"];

/** Como um recurso entra no plano: fora dele, opcional (quem usa liga e
 * desliga) ou obrigatório (ligado, sem interruptor). */
export type FeatureMode = "off" | "optional" | "locked";

/** As moedas que o admin oferece além da padrão: as de duas casas decimais, que
 * o Stripe conta em centavos. A mesma lista de `admin_save_plan`. */
export const EXTRA_CURRENCIES = ["usd", "eur", "gbp", "brl", "cad", "aud", "chf", "mxn", "inr"] as const;

/** O preço do plano em outra moeda e os países (códigos de duas letras) a que
 * vale; sem países, vale onde a moeda é usada. */
export interface ExtraPrice { currency: string; priceCents: number | null; countries: string[] }

export interface PlanFeature { key: string; mode: Exclude<FeatureMode, "off">; defaultOn: boolean }

export interface Plan {
  key: string;
  name: string;
  description: string;
  position: number;
  active: boolean;
  isDefault: boolean;
  /** Os ids no Stripe: quem os grava é a função `billing`, não o formulário. */
  stripeProductId: string | null;
  stripePriceId: string | null;
  /** Quando o Stripe recebeu o plano pela última vez; nulo, ainda não ou o
   * admin mexeu depois. */
  stripeSyncedAt: string | null;
  priceCents: number | null;
  currency: string | null;
  billingInterval: "month" | "year" | null;
  /** Preços em outras moedas, enviados ao Stripe como `currency_options`. */
  extraPrices: ExtraPrice[];
  features: PlanFeature[];
  /** Chamadas do Jev por dia; nulo usa o padrão do servidor. */
  jevDailyLimit: number | null;
  /** Pedidos por dia com o Jev completo; depois dele, a heurística local do
   * app. Nulo, sem teto. */
  jevDailyRequests: number | null;
  /** Pedidos de chats diferentes ao mesmo tempo (1 a 8). */
  maxConcurrentTurns: number;
}

export interface FeatureRow { key: FeatureKey; enabled: boolean; position: number; core: boolean }

/** Plano novo: o núcleo já travado. */
export const blankPlan = (position: number): Plan => ({
  key: "", name: "", description: "", position, active: true, isDefault: false,
  stripeProductId: null, stripePriceId: null, stripeSyncedAt: null, priceCents: null, currency: "brl", billingInterval: "month", extraPrices: [],
  features: CORE_FEATURES.map((key) => ({ key, mode: "locked", defaultOn: true })),
  jevDailyLimit: null, jevDailyRequests: null, maxConcurrentTurns: 1,
});

/** O modo do recurso no plano. O núcleo é sempre obrigatório. */
export function modeOf(plan: Pick<Plan, "features">, feature: Pick<FeatureRow, "key">): FeatureMode {
  return plan.features.find((item) => item.key === feature.key)?.mode ?? "off";
}

/** O plano com o recurso no modo escolhido; o núcleo não sai do obrigatório. */
export function withMode(plan: Plan, feature: Pick<FeatureRow, "key">, mode: FeatureMode): Plan {
  const others = plan.features.filter((item) => item.key !== feature.key);
  if (mode === "off") return { ...plan, features: others };
  const current = plan.features.find((item) => item.key === feature.key);
  return { ...plan, features: [...others, { key: feature.key, mode, defaultOn: current?.defaultOn ?? true }] };
}

/** O valor de partida de um recurso opcional. */
export function withDefault(plan: Plan, key: string, defaultOn: boolean): Plan {
  return { ...plan, features: plan.features.map((item) => (item.key === key ? { ...item, defaultOn } : item)) };
}

/** Os recursos como a RPC `admin_save_plan` os recebe. */
export function featuresPayload(plan: Pick<Plan, "features">) {
  return plan.features.map((item) => ({ key: item.key, mode: item.mode, default_on: item.defaultOn }));
}

/** Os preços extras como a RPC `admin_save_plan` os recebe (a linha sem valor fica de fora). */
export function extraPricesPayload(plan: Pick<Plan, "extraPrices">) {
  return plan.extraPrices.filter((item) => item.priceCents !== null)
    .map((item) => ({ currency: item.currency, price_cents: item.priceCents, countries: item.countries }));
}

/** Os países digitados (`us, ca`) como lista de códigos em maiúsculas, sem repetir. */
export function parseCountries(text: string): string[] {
  return [...new Set(text.split(/[\s,;]+/).map((code) => code.trim().toUpperCase()).filter(Boolean))];
}

/** O erro das RPCs do admin chega como chave do i18n (`admin.error.inUse`). */
export function adminFailure(error: { message?: string }) {
  if (error.message && /^admin\.[A-Za-z.]+$/.test(error.message)) return { key: error.message };
  return error.message ?? "unknown";
}
