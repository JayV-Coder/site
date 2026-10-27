/** O preço de um plano como se lê na página: na moeda do plano, no formato do
 * idioma (R$ 49,90 em português). Plano gratuito, ou sem preço, dá nulo. */
export interface Priced {
  isDefault: boolean;
  priceCents: number | null;
  currency: string | null;
  interval?: "month" | "year" | null;
}

export function formatPlanPrice(plan: Priced, locale: string): string | null {
  if (plan.isDefault || plan.priceCents === null || !plan.currency) return null;
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: plan.currency.toUpperCase() }).format(plan.priceCents / 100);
  } catch {
    return `${(plan.priceCents / 100).toFixed(2)} ${plan.currency.toUpperCase()}`;
  }
}

/** O plano pago mais barato, para o "a partir de" da página inicial. */
export function cheapestPaid<T extends Priced>(plans: T[]): T | null {
  const paid = plans.filter((plan) => !plan.isDefault && plan.priceCents !== null && plan.priceCents > 0 && plan.currency);
  return paid.reduce<T | null>((best, plan) => (!best || plan.priceCents! < best.priceCents! ? plan : best), null);
}
