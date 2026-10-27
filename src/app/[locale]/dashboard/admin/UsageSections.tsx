"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EmptyText } from "@/components/atoms";
import { ConfirmAction, FormField, SettingsSection, StatTile } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFeedback } from "@/modules/feedback";
import { useLocale, useT, type Key } from "@/modules/i18n";
import type { Plan } from "@/modules/plans/catalog";
import { formatCount, formatUsd, parsePrice, unusedFeatures, type FeatureUsage, type JevCosts, type ModelPrice } from "@/modules/usage";
import { deleteModelPrice, saveModelPrice } from "./actions";

type PriceDraft = { pattern: string; inputUsd: string; outputUsd: string; cacheReadUsd: string; cacheWriteUsd: string };
const draftOf = (price: ModelPrice | null): PriceDraft => ({
  pattern: price?.pattern ?? "",
  inputUsd: price ? String(price.inputUsd) : "",
  outputUsd: price ? String(price.outputUsd) : "",
  cacheReadUsd: price?.cacheReadUsd == null ? "" : String(price.cacheReadUsd),
  cacheWriteUsd: price?.cacheWriteUsd == null ? "" : String(price.cacheWriteUsd),
});

/** A tabela de preços por modelo: dólares por milhão de tokens. O app e o uso
 * da equipe a usam para as chamadas que não informaram custo. */
export function PricesSection({ prices }: { prices: ModelPrice[] | null }) {
  const t = useT();
  const [adding, setAdding] = useState(false);
  if (prices === null) return <EmptyText>{t("site.admin.usage.unavailable")}</EmptyText>;
  return (
    <SettingsSection title={t("site.admin.prices.title")} description={t("site.admin.prices.description")}>
      {prices.length === 0 && !adding && <EmptyText>{t("site.admin.prices.empty")}</EmptyText>}
      <div className="grid gap-3">
        {prices.map((price) => <PriceRow key={price.pattern} price={price} />)}
        {adding
          ? <PriceRow price={null} onDone={() => setAdding(false)} />
          : <Button variant="outline" className="justify-self-start" onClick={() => setAdding(true)}>{t("site.admin.prices.add")}</Button>}
      </div>
    </SettingsSection>
  );
}

function PriceRow({ price, onDone }: { price: ModelPrice | null; onDone?: () => void }) {
  const t = useT();
  const router = useRouter();
  const { notify, report } = useFeedback();
  const [busy, startBusy] = useTransition();
  const [draft, setDraft] = useState(() => draftOf(price));
  const parsed = parsePrice(draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(draftOf(price));
  const id = (field: string) => `price-${price?.pattern ?? "new"}-${field}`;
  const edit = (patch: Partial<PriceDraft>) => setDraft((current) => ({ ...current, ...patch }));

  const save = () => parsed && startBusy(async () => {
    const result = await saveModelPrice(parsed, price?.pattern ?? null);
    if (!result.ok) return report(result.error);
    notify(t("site.admin.prices.saved", { pattern: parsed.pattern }));
    onDone?.();
    router.refresh();
  });
  const remove = () => price && startBusy(async () => {
    const result = await deleteModelPrice(price.pattern);
    if (!result.ok) return report(result.error);
    notify(t("site.admin.prices.deleted", { pattern: price.pattern }));
    router.refresh();
  });

  const field = (key: keyof PriceDraft, label: Key, hint?: Key) => (
    <FormField label={t(label)} htmlFor={id(key)} hint={hint ? t(hint) : undefined}>
      <Input id={id(key)} value={draft[key]} inputMode={key === "pattern" ? "text" : "decimal"} maxLength={key === "pattern" ? 80 : 12}
        onChange={(event) => edit({ [key]: event.target.value })} />
    </FormField>
  );

  return (
    <div className="grid gap-3 rounded-lg border border-border/60 px-3 py-3">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] items-end gap-3">
        {field("pattern", "site.admin.prices.pattern", "site.admin.prices.patternHint")}
        {field("inputUsd", "site.admin.prices.input")}
        {field("outputUsd", "site.admin.prices.output")}
        {field("cacheReadUsd", "site.admin.prices.cacheRead", "site.admin.prices.cacheHint")}
        {field("cacheWriteUsd", "site.admin.prices.cacheWrite", "site.admin.prices.cacheHint")}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {price
          ? (
            <ConfirmAction title={t("site.admin.prices.deleteTitle", { pattern: price.pattern })} description={t("site.admin.prices.deleteHint")}
              confirm={t("common.delete")} onConfirm={remove}>
              <Button variant="ghost" disabled={busy}>{t("common.delete")}</Button>
            </ConfirmAction>
          )
          : <Button variant="ghost" onClick={onDone}>{t("settings.discard")}</Button>}
        {price && dirty && <Button variant="ghost" onClick={() => setDraft(draftOf(price))}>{t("settings.discard")}</Button>}
        <Button loading={busy} disabled={!dirty || !parsed} onClick={save}>{t("settings.save")}</Button>
      </div>
    </div>
  );
}

/** O custo do Jev por plano nos últimos 30 dias (o que o JayV paga), e quem
 * mais gastou. Sem preço na tabela, o custo fica em branco e a coluna das
 * chamadas sem preço diz por quê. */
export function JevCostSection({ costs, plans }: { costs: JevCosts | null; plans: Plan[] }) {
  const t = useT();
  const locale = useLocale();
  if (costs === null) return <EmptyText>{t("site.admin.usage.unavailable")}</EmptyText>;
  const nameOf = (key: string) => plans.find((plan) => plan.key === key)?.name ?? key;
  const capOf = (key: string) => plans.find((plan) => plan.key === key)?.jevDailyRequests ?? null;
  const usd = (value: number | null) => (value === null ? "—" : formatUsd(value, locale));
  return (
    <div className="grid gap-4">
      <SettingsSection title={t("site.admin.jevCost.title")} description={t("site.admin.jevCost.description", { days: costs.days })}>
        {costs.plans.length === 0 ? <EmptyText>{t("site.admin.jevCost.empty")}</EmptyText> : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {costs.plans.map((row) => {
              const cap = capOf(row.plan);
              return (
                <StatTile key={row.plan} label={nameOf(row.plan)} value={usd(row.costPerUser)}
                  hint={(
                    <>
                      {t("site.admin.jevCost.perUser")}
                      <br />
                      {t("site.admin.jevCost.line", {
                        users: row.users, requests: formatCount(row.requests, locale), cost: usd(row.costUsd),
                        perDay: row.requestsPerUserDay === null ? "—" : row.requestsPerUserDay.toFixed(1),
                      })}
                      <br />
                      {cap === null ? t("site.admin.jevCost.noCap") : t("site.admin.jevCost.cap", { cap })}
                      {row.unpricedCalls > 0 && <><br />{t("site.admin.jevCost.unpriced", { count: row.unpricedCalls })}</>}
                    </>
                  )} />
              );
            })}
          </div>
        )}
      </SettingsSection>
      {costs.top.length > 0 && (
        <SettingsSection title={t("site.admin.jevCost.top")}>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 pe-3 text-start font-normal">{t("site.admin.jevCost.account")}</th>
                  <th className="py-1 pe-3 text-start font-normal">{t("site.admin.jevCost.plan")}</th>
                  <th className="py-1 pe-3 text-end font-normal">{t("site.admin.jevCost.requests")}</th>
                  <th className="py-1 pe-3 text-end font-normal">{t("site.admin.jevCost.tokens")}</th>
                  <th className="py-1 text-end font-normal">{t("site.admin.jevCost.cost")}</th>
                </tr>
              </thead>
              <tbody>
                {costs.top.map((row) => (
                  <tr key={row.userId} className="border-t border-border/60">
                    <td className="max-w-56 truncate py-1.5 pe-3">{row.email || row.userId}</td>
                    <td className="py-1.5 pe-3">{nameOf(row.plan)}</td>
                    <td className="py-1.5 pe-3 text-end tabular-nums">{formatCount(row.requests, locale)}</td>
                    <td className="py-1.5 pe-3 text-end tabular-nums">{formatCount(row.tokens, locale)}</td>
                    <td className="py-1.5 text-end tabular-nums">{usd(row.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SettingsSection>
      )}
    </div>
  );
}

/** O uso de cada recurso em 30 e 60 dias, só de quem aceitou a telemetria no
 * app. O recurso que o app ainda não mede aparece como "sem medição", não
 * como zero. */
export function FeatureUsageSection({ usage }: { usage: FeatureUsage | null }) {
  const t = useT();
  const locale = useLocale();
  if (usage === null) return <EmptyText>{t("site.admin.usage.unavailable")}</EmptyText>;
  const unused = new Set(unusedFeatures(usage).map((item) => item.feature));
  return (
    <SettingsSection title={t("site.admin.featureUsage.title")} description={t("site.admin.featureUsage.description", { count: usage.consenting })}>
      {usage.consenting === 0 && <EmptyText>{t("site.admin.featureUsage.nobody")}</EmptyText>}
      <div className="overflow-x-auto">
        <table className="w-full text-start text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-1 pe-3 text-start font-normal">{t("site.admin.featureUsage.feature")}</th>
              <th className="py-1 pe-3 text-end font-normal">{t("site.admin.featureUsage.users30")}</th>
              <th className="py-1 pe-3 text-end font-normal">{t("site.admin.featureUsage.uses30")}</th>
              <th className="py-1 pe-3 text-end font-normal">{t("site.admin.featureUsage.users60")}</th>
              <th className="py-1 text-end font-normal">{t("site.admin.featureUsage.uses60")}</th>
            </tr>
          </thead>
          <tbody>
            {usage.features.map((row) => (
              <tr key={row.feature} className="border-t border-border/60">
                <td className="py-1.5 pe-3">
                  <span className={row.enabled ? "" : "text-muted-foreground line-through"}>{t(`feature.${row.feature}.title` as Key)}</span>
                  {!row.measured && <Badge variant="secondary" className="ms-2">{t("site.admin.featureUsage.notMeasured")}</Badge>}
                  {unused.has(row.feature) && <Badge variant="outline" className="ms-2">{t("site.admin.featureUsage.unused")}</Badge>}
                </td>
                {row.measured
                  ? [row.users30, row.uses30, row.users60, row.uses60].map((value, index) => (
                    <td key={index} className={`py-1.5 text-end tabular-nums ${index < 3 ? "pe-3" : ""}`}>{formatCount(value, locale)}</td>
                  ))
                  : <td colSpan={4} className="py-1.5 text-end text-muted-foreground">—</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SettingsSection>
  );
}
