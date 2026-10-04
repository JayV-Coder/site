"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmAction, FormField, OptionSelect, SettingsSection, ToggleRow } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFeedback } from "@/modules/feedback";
import { useT, type Key } from "@/modules/i18n";
import { blankPlan, type FeatureRow, type Plan } from "@/modules/plans/catalog";
import { deletePlan, savePlan, setFeatureEnabled, type ActionResult } from "./actions";

/** A administração do sistema, trazida do app: liga e desliga cada recurso
 * para todo mundo e monta os planos (preço do Stripe e recursos de cada um).
 * O servidor leu o catálogo; cada gravação volta por uma server action e a
 * página relê. */
export function AdminBoard({ plans, features, subscribers }: { plans: Plan[]; features: FeatureRow[]; subscribers: Record<string, number> }) {
  const t = useT();
  const router = useRouter();
  const { report } = useFeedback();
  const [adding, setAdding] = useState(false);
  // O interruptor muda na hora; a página relida confirma (ou desfaz).
  const [shown, setShown] = useState(features);
  useEffect(() => setShown(features), [features]);

  const toggle = async (feature: string, enabled: boolean) => {
    setShown((current) => current.map((row) => (row.key === feature ? { ...row, enabled } : row)));
    const result = await setFeatureEnabled(feature, enabled);
    if (!result.ok) report(result.error);
    router.refresh();
  };

  return (
    <Tabs defaultValue="features" className="gap-5">
      <TabsList className="h-auto w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="features" className="flex-none px-4 py-2">{t("admin.tab.features")}</TabsTrigger>
        <TabsTrigger value="plans" className="flex-none px-4 py-2">{t("admin.tab.plans")}</TabsTrigger>
      </TabsList>

      <TabsContent value="features">
        <SettingsSection title={t("admin.features.title")} description={t("admin.features.description")}>
          <div className="grid gap-2">
            {shown.map((feature) => (
              <ToggleRow
                key={feature.key}
                id={`feature-${feature.key}`}
                label={t(`feature.${feature.key}.title` as Key)}
                hint={t(`feature.${feature.key}.detail` as Key)}
                checked={feature.enabled}
                onChange={(enabled) => void toggle(feature.key, enabled)}
              />
            ))}
          </div>
        </SettingsSection>
      </TabsContent>

      <TabsContent value="plans" className="grid gap-4">
        <p className="text-sm text-muted-foreground">{t("admin.plans.description")}</p>
        {plans.map((plan) => (
          <PlanEditor key={plan.key} plan={plan} features={shown} subscribers={subscribers[plan.key] ?? 0} />
        ))}
        {adding
          ? <PlanEditor plan={blankPlan((plans.at(-1)?.position ?? 0) + 10)} features={shown} subscribers={0} fresh onDone={() => setAdding(false)} />
          : <Button variant="outline" className="justify-self-start" onClick={() => setAdding(true)}>{t("admin.plan.new")}</Button>}
      </TabsContent>
    </Tabs>
  );
}

function PlanEditor({ plan, features, subscribers, fresh, onDone }: {
  plan: Plan; features: FeatureRow[]; subscribers: number; fresh?: boolean; onDone?: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const { notify, report } = useFeedback();
  const [busy, startBusy] = useTransition();
  const [draft, setDraft] = useState(plan);
  // O catálogo relido (outra aba, outro admin) troca o rascunho sem alteração.
  useEffect(() => setDraft(plan), [plan]);
  const dirty = fresh || JSON.stringify(draft) !== JSON.stringify(plan);
  const edit = (patch: Partial<Plan>) => setDraft((current) => ({ ...current, ...patch }));
  const toggle = (key: string, on: boolean) => edit({ features: on ? [...draft.features, key] : draft.features.filter((item) => item !== key) });
  const id = (field: string) => `plan-${plan.key || "new"}-${field}`;
  const price = draft.priceCents === null ? "" : (draft.priceCents / 100).toString();
  const paid = !draft.isDefault;

  const run = (action: () => Promise<ActionResult>, done: string) => startBusy(async () => {
    const result = await action();
    if (!result.ok) {
      report(result.error);
      return;
    }
    notify(done);
    onDone?.();
    router.refresh();
  });

  return (
    <SettingsSection
      title={draft.name || t("admin.plan.untitled")}
      description={fresh ? t("admin.plan.newHint") : t("admin.plan.subscribers", { count: subscribers })}
      action={(
        <div className="flex items-center gap-2">
          {draft.isDefault && <Badge variant="accent">{t("admin.plan.defaultBadge")}</Badge>}
          {!draft.active && <Badge variant="secondary">{t("admin.plan.inactiveBadge")}</Badge>}
        </div>
      )}
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        <FormField label={t("admin.plan.key")} htmlFor={id("key")} hint={t("admin.plan.keyHint")}>
          <Input id={id("key")} value={draft.key} disabled={!fresh} onChange={(event) => edit({ key: event.target.value.toLowerCase() })} />
        </FormField>
        <FormField label={t("admin.plan.name")} htmlFor={id("name")}>
          <Input id={id("name")} value={draft.name} maxLength={60} onChange={(event) => edit({ name: event.target.value })} />
        </FormField>
        <FormField label={t("admin.plan.descriptionField")} htmlFor={id("description")} wide>
          <Input id={id("description")} value={draft.description} maxLength={300} onChange={(event) => edit({ description: event.target.value })} />
        </FormField>
        {paid && (
          <>
            <FormField label={t("admin.plan.price")} htmlFor={id("price")} hint={t("admin.plan.priceHint")}>
              <Input id={id("price")} type="number" min={0} step="0.01" value={price} onChange={(event) => edit({ priceCents: event.target.value === "" ? null : Math.round(Number(event.target.value) * 100) })} />
            </FormField>
            <FormField label={t("admin.plan.currency")} htmlFor={id("currency")}>
              <Input id={id("currency")} value={draft.currency ?? ""} maxLength={3} onChange={(event) => edit({ currency: event.target.value.toLowerCase() || null })} />
            </FormField>
            <FormField label={t("admin.plan.interval")} htmlFor={id("interval")}>
              <OptionSelect
                id={id("interval")}
                value={draft.billingInterval ?? "month"}
                options={[{ value: "month", label: t("plans.interval.month") }, { value: "year", label: t("plans.interval.year") }]}
                onChange={(billingInterval) => edit({ billingInterval })}
              />
            </FormField>
            <FormField label={t("admin.plan.stripePrice")} htmlFor={id("stripe")} hint={t("admin.plan.stripePriceHint")} wide>
              <Input id={id("stripe")} value={draft.stripePriceId ?? ""} placeholder="price_..." onChange={(event) => edit({ stripePriceId: event.target.value.trim() || null })} />
            </FormField>
          </>
        )}
      </div>

      <div className="grid gap-2 @xl:grid-cols-2">
        <ToggleRow id={id("active")} label={t("admin.plan.active")} hint={t("admin.plan.activeHint")} checked={draft.active} disabled={draft.isDefault} onChange={(active) => edit({ active })} />
        <ToggleRow id={id("default")} label={t("admin.plan.default")} hint={t("admin.plan.defaultHint")} checked={draft.isDefault} disabled={plan.isDefault} onChange={(isDefault) => edit({ isDefault, active: isDefault || draft.active })} />
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-xs text-muted-foreground">{t("admin.plan.features")}</legend>
        <div className="grid gap-2 @xl:grid-cols-2">
          {features.map((feature) => (
            <label key={feature.key} className="flex items-center gap-2.5 text-sm">
              <Checkbox checked={draft.features.includes(feature.key)} onCheckedChange={(on) => toggle(feature.key, on === true)} />
              <span className={feature.enabled ? undefined : "text-muted-foreground line-through"}>{t(`feature.${feature.key}.title` as Key)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap justify-end gap-2">
        {fresh
          ? <Button variant="ghost" onClick={onDone}>{t("settings.discard")}</Button>
          : !plan.isDefault && (
            <ConfirmAction
              title={t("admin.plan.deleteTitle", { plan: plan.name })}
              description={t("admin.plan.deleteHint")}
              confirm={t("admin.plan.delete")}
              onConfirm={() => run(() => deletePlan(plan.key), t("admin.plan.deleted", { plan: plan.name }))}
            >
              <Button variant="ghost" disabled={busy}>{t("admin.plan.delete")}</Button>
            </ConfirmAction>
          )}
        {!fresh && dirty && <Button variant="ghost" onClick={() => setDraft(plan)}>{t("settings.discard")}</Button>}
        <Button loading={busy} disabled={!dirty || !draft.key || !draft.name.trim()} onClick={() => run(() => savePlan(draft), t("admin.plan.saved", { plan: draft.name }))}>{t("settings.save")}</Button>
      </div>
    </SettingsSection>
  );
}
