"use server";

import { revalidatePath } from "next/cache";
import type { Text } from "@/modules/i18n/types";
import { adminFailure, featuresPayload, type Plan } from "@/modules/plans/catalog";
import { auth } from "@/auth";
import { SUPABASE_KEY, SUPABASE_URL } from "@/modules/supabase/config";
import { userSupabase } from "@/modules/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: Text | string };
/** Salvar o plano e enviá-lo ao Stripe são dois passos: o plano pode ter sido
 * salvo e o Stripe, não. `sync` diz como o segundo terminou. */
export type SaveResult = { ok: true; sync: { ok: true } | { ok: false; error: Text } } | { ok: false; error: Text | string };

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

/** A Edge Function `billing` (ações `sync_plan` e `archive_plan`): só admin,
 * com o token de quem entrou. É ela quem tem a chave do Stripe. */
async function billing(body: Record<string, unknown>): Promise<{ ok: true } | { ok: false; error: Text }> {
  const session = await auth();
  if (!session?.accessToken) return { ok: false, error: { key: "admin.forbidden" } };
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/billing`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.accessToken}`, apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (response.ok) return { ok: true };
    const detail = (await response.json().catch(() => null)) as { code?: string; error?: string } | null;
    if (detail?.code === "config") return { ok: false, error: { key: "site.admin.plan.stripe.error.config" } };
    if (detail?.code === "price") return { ok: false, error: { key: "site.admin.plan.stripe.error.price" } };
    if (detail?.code === "forbidden" || detail?.code === "session") return { ok: false, error: { key: "admin.forbidden" } };
    return { ok: false, error: { key: "site.admin.plan.stripe.error.stripe", params: { message: detail?.error ?? String(response.status) } } };
  } catch (error) {
    return { ok: false, error: { key: "site.admin.plan.stripe.error.stripe", params: { message: error instanceof Error ? error.message : String(error) } } };
  }
}

/** Salva o plano e o envia ao Stripe (produto e preço). O preço do Stripe não
 * vem do formulário: a função o cria a partir de valor, moeda e intervalo. */
export async function savePlan(plan: Plan): Promise<SaveResult> {
  const saved = await call("admin_save_plan", {
    plan: {
      key: plan.key, name: plan.name, description: plan.description, position: plan.position, active: plan.active, is_default: plan.isDefault,
      price_cents: plan.isDefault ? null : plan.priceCents, currency: plan.isDefault ? "" : plan.currency ?? "", billing_interval: plan.isDefault ? "" : plan.billingInterval ?? "",
      jev_daily_limit: plan.jevDailyLimit ?? "", max_concurrent_turns: plan.maxConcurrentTurns,
      features: featuresPayload(plan),
    },
  });
  if (!saved.ok) return saved;
  const sync = await billing({ action: "sync_plan", plan: plan.key });
  revalidatePath("/[locale]/dashboard/admin", "page");
  return { ok: true, sync };
}

/** Reenvia o plano ao Stripe sem mudar nada: quando o envio do salvar falhou. */
export async function syncPlan(key: string): Promise<ActionResult> {
  const sent = await billing({ action: "sync_plan", plan: key });
  revalidatePath("/[locale]/dashboard/admin", "page");
  return sent;
}

/** Apagar o plano tira o produto e o preço de venda no Stripe (arquivados, não
 * apagados: quem assinou segue até cancelar). O banco recusa o plano com
 * assinante; só depois de apagado o arquivamento acontece, com os ids lidos
 * antes. Se o Stripe falhar, o plano já se foi e o produto fica só no Stripe. */
export async function deletePlan(key: string): Promise<ActionResult> {
  const supabase = await userSupabase();
  const ids = supabase
    ? (await supabase.from("plans").select("stripe_product_id, stripe_price_id").eq("key", key).maybeSingle()).data as { stripe_product_id?: string | null; stripe_price_id?: string | null } | null
    : null;
  const deleted = await call("admin_delete_plan", { plan: key });
  if (deleted.ok && ids?.stripe_product_id) {
    const archived = await billing({ action: "archive_plan", productId: ids.stripe_product_id, priceId: ids.stripe_price_id ?? undefined });
    if (!archived.ok) console.error("admin: arquivar o produto do plano", key, archived.error);
  }
  return deleted;
}
