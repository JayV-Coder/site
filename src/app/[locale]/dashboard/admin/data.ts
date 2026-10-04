import "server-only";
import { FEATURES, type FeatureRow, type Plan } from "@/modules/plans/catalog";
import { userSupabase } from "@/modules/supabase/server";

type PlanRow = {
  key: string; name: string; description: string; position: number; active: boolean; is_default: boolean;
  stripe_price_id: string | null; price_cents: number | null; currency: string | null; billing_interval: "month" | "year" | null;
};

export type AdminData =
  | { state: "signedOut" }
  | { state: "forbidden" }
  | { state: "ready"; plans: Plan[]; features: FeatureRow[]; subscribers: Record<string, number> };

/** Planos, recursos e assinantes, lidos com o token de quem entrou. Quem
 * decide se é admin é o banco (`my_features().admin`, que lê `is_admin()`);
 * cada gravação confere de novo. */
export async function loadAdmin(): Promise<AdminData> {
  const supabase = await userSupabase();
  if (!supabase) return { state: "signedOut" };
  const me = await supabase.rpc("my_features");
  if (me.error || !(me.data as { admin?: boolean } | null)?.admin) return { state: "forbidden" };

  const [plans, links, features, counts] = await Promise.all([
    supabase.from("plans").select("key, name, description, position, active, is_default, stripe_price_id, price_cents, currency, billing_interval").order("position").order("key"),
    supabase.from("plan_features").select("plan_key, feature_key"),
    supabase.from("features").select("key, enabled, position").order("position").order("key"),
    supabase.rpc("admin_plan_counts"),
  ]);
  for (const result of [plans, links, features]) if (result.error) throw new Error(result.error.message);
  const included = (key: string) => (links.data ?? []).filter((link) => link.plan_key === key).map((link) => link.feature_key as string);
  return {
    state: "ready",
    plans: (plans.data as PlanRow[]).map((row) => ({
      key: row.key, name: row.name, description: row.description, position: row.position, active: row.active, isDefault: row.is_default,
      stripePriceId: row.stripe_price_id, priceCents: row.price_cents, currency: row.currency, billingInterval: row.billing_interval,
      features: included(row.key),
    })),
    features: (features.data as FeatureRow[]).filter((row) => (FEATURES as readonly string[]).includes(row.key)),
    subscribers: counts.error ? {} : Object.fromEntries((counts.data as { plan_key: string; subscribers: number }[]).map((row) => [row.plan_key, Number(row.subscribers)])),
  };
}
