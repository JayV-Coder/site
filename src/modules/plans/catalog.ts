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
] as const;

export type FeatureKey = (typeof FEATURES)[number];

export const isFeature = (key: string): key is FeatureKey => (FEATURES as readonly string[]).includes(key);

export interface Plan {
  key: string;
  name: string;
  description: string;
  position: number;
  active: boolean;
  isDefault: boolean;
  stripePriceId: string | null;
  priceCents: number | null;
  currency: string | null;
  billingInterval: "month" | "year" | null;
  features: string[];
}

export interface FeatureRow { key: FeatureKey; enabled: boolean; position: number }

export const blankPlan = (position: number): Plan => ({
  key: "", name: "", description: "", position, active: true, isDefault: false,
  stripePriceId: null, priceCents: null, currency: "brl", billingInterval: "month", features: [],
});

/** O erro das RPCs do admin chega como chave do i18n (`admin.error.inUse`). */
export function adminFailure(error: { message?: string }) {
  if (error.message && /^admin\.[A-Za-z.]+$/.test(error.message)) return { key: error.message };
  return error.message ?? "unknown";
}
