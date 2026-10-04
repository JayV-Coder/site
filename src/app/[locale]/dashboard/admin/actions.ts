"use server";

import { revalidatePath } from "next/cache";
import type { Text } from "@/modules/i18n/types";
import { adminFailure, type Plan } from "@/modules/plans/catalog";
import { userSupabase } from "@/modules/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: Text | string };

/** As gravações do admin, pelas mesmas RPCs do app (`admin_set_feature`,
 * `admin_save_plan`, `admin_delete_plan`). O token é o de quem entrou: o banco
 * recusa quem não é admin. */
async function call(name: string, args: Record<string, unknown>): Promise<ActionResult> {
  const supabase = await userSupabase();
  if (!supabase) return { ok: false, error: { key: "admin.forbidden" } };
  const { error } = await supabase.rpc(name, args);
  if (error) return { ok: false, error: adminFailure(error) };
  revalidatePath("/[locale]/dashboard/admin", "page");
  return { ok: true };
}

export async function setFeatureEnabled(feature: string, enabled: boolean) {
  return call("admin_set_feature", { feature, on_off: enabled });
}

export async function savePlan(plan: Plan) {
  return call("admin_save_plan", {
    plan: {
      key: plan.key, name: plan.name, description: plan.description, position: plan.position, active: plan.active, is_default: plan.isDefault,
      stripe_price_id: plan.isDefault ? "" : plan.stripePriceId ?? "", price_cents: plan.priceCents, currency: plan.currency ?? "", billing_interval: plan.billingInterval ?? "",
      features: plan.features,
    },
  });
}

export async function deletePlan(key: string) {
  return call("admin_delete_plan", { plan: key });
}
