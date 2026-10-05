import "server-only";
import { FEATURES, type FeatureRow, type Plan } from "@/modules/plans/catalog";
import { userSupabase } from "@/modules/supabase/server";

type PlanRow = {
  key: string; name: string; description: string; position: number; active: boolean; is_default: boolean;
  stripe_price_id: string | null; price_cents: number | null; currency: string | null; billing_interval: "month" | "year" | null;
  jev_daily_limit?: number | null; max_concurrent_turns?: number | null;
};
type LinkRow = { plan_key: string; feature_key: string; mode?: "optional" | "locked"; default_on?: boolean };
type FeatureDbRow = { key: string; enabled: boolean; position: number; core?: boolean };

const PLAN_COLUMNS = "key, name, description, position, active, is_default, stripe_price_id, price_cents, currency, billing_interval";
/** A coluna que ainda não existe (o banco antes da migração `core_features`). */
const missingColumn = (error: { code?: string } | null) => error?.code === "42703";

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

  const read = (fresh: boolean) => Promise.all([
    supabase.from("plans").select(fresh ? `${PLAN_COLUMNS}, jev_daily_limit, max_concurrent_turns` : PLAN_COLUMNS).order("position").order("key"),
    supabase.from("plan_features").select(fresh ? "plan_key, feature_key, mode, default_on" : "plan_key, feature_key"),
    supabase.from("features").select(fresh ? "key, enabled, position, core" : "key, enabled, position").order("position").order("key"),
  ]);
  // O banco sem a migração dos recursos de núcleo não tem as colunas novas:
  // a página abre com o que ele tem, tudo opcional.
  let [plans, links, features] = await read(true);
  if ([plans, links, features].some((result) => missingColumn(result.error))) [plans, links, features] = await read(false);
  const counts = await supabase.rpc("admin_plan_counts");
  for (const result of [plans, links, features]) if (result.error) throw new Error(result.error.message);
  const included = (key: string) => ((links.data ?? []) as unknown as LinkRow[]).filter((link) => link.plan_key === key)
    .map((link) => ({ key: link.feature_key, mode: link.mode ?? "optional", defaultOn: link.default_on ?? true }));
  return {
    state: "ready",
    plans: (plans.data as unknown as PlanRow[]).map((row) => ({
      key: row.key, name: row.name, description: row.description, position: row.position, active: row.active, isDefault: row.is_default,
      stripePriceId: row.stripe_price_id, priceCents: row.price_cents, currency: row.currency, billingInterval: row.billing_interval,
      features: included(row.key),
      jevDailyLimit: row.jev_daily_limit ?? null,
      maxConcurrentTurns: row.max_concurrent_turns ?? 1,
    })),
    features: (features.data as unknown as FeatureDbRow[]).filter((row) => (FEATURES as readonly string[]).includes(row.key))
      .map((row) => ({ key: row.key as FeatureRow["key"], enabled: row.enabled, position: row.position, core: row.core ?? false })),
    subscribers: counts.error ? {} : Object.fromEntries((counts.data as { plan_key: string; subscribers: number }[]).map((row) => [row.plan_key, Number(row.subscribers)])),
  };
}
