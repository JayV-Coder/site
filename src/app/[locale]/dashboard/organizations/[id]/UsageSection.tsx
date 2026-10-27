"use client";

import { EmptyText } from "@/components/atoms";
import { DailyBars, SettingsSection, StatTile } from "@/components/molecules";
import { useLocale, useT } from "@/modules/i18n";
import { formatCount, formatUsd, usageTotals, type OrgUsage } from "@/modules/usage";

/** O uso da equipe por semana, só para owner e maintainer: pedidos,
 * objetivos, tarefas comprovadas pelo validador, tokens dos agentes e custo
 * (o informado mais a estimativa da tabela de preços). O Jev fica de fora: a
 * equipe não paga por ele. Os dados vêm do que os apps dos membros
 * sincronizam para os projetos da organização. */
export function UsageSection({ usage }: { usage: OrgUsage | null }) {
  const t = useT();
  const locale = useLocale();
  if (usage === null) return <EmptyText>{t("site.org.usage.unavailable")}</EmptyText>;
  const totals = usageTotals(usage);
  const usd = (value: number | null) => (value === null ? "—" : formatUsd(value, locale));
  const week = (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
  const bars = (title: string, pick: (point: OrgUsage["series"][number]) => number, shown: (value: number) => string, summary: string) => (
    <DailyBars title={title} summary={summary} peakLabel={t("site.org.usage.peak", { value: shown(Math.max(0, ...usage.series.map(pick))) })}
      tableLabel={t("site.org.usage.table")} dayLabel={t("site.org.usage.week")} valueLabel={title}
      points={usage.series.map((point) => ({ label: week(point.week), value: pick(point), shown: shown(pick(point)) }))} />
  );

  return (
    <div className="grid gap-4">
      <SettingsSection title={t("site.org.usage.title")} description={t("site.org.usage.description", { weeks: usage.weeks })}>
        {totals.requests === 0 ? <EmptyText>{t("site.org.usage.empty")}</EmptyText> : (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
              <StatTile label={t("site.org.usage.requests")} value={formatCount(totals.requests, locale)}
                hint={t("site.org.usage.objectives", { count: totals.objectives })} />
              <StatTile label={t("site.org.usage.turnsPerObjective")} value={totals.turnsPerObjective === null ? "—" : totals.turnsPerObjective.toFixed(1)} />
              <StatTile label={t("site.org.usage.verified")} value={formatCount(totals.verified, locale)}
                hint={t("site.org.usage.verifiedHint", { failed: totals.failed, unproven: totals.unproven })} />
              <StatTile label={t("site.org.usage.cost")} value={usd(totals.costUsd)}
                hint={totals.unpricedCalls > 0 ? t("site.org.usage.unpriced", { count: totals.unpricedCalls }) : t("site.org.usage.costHint")} />
              <StatTile label={t("site.org.usage.costPerVerified")} value={usd(totals.costPerVerified)}
                hint={totals.tokensPerVerified === null ? t("site.org.usage.noVerified") : t("site.org.usage.tokensPerVerified", { tokens: formatCount(totals.tokensPerVerified, locale) })} />
            </div>
            <div className="grid gap-3 @3xl:grid-cols-2">
              {bars(t("site.org.usage.costPerWeek"), (point) => point.costUsd, (value) => usd(value), usd(totals.costUsd))}
              {bars(t("site.org.usage.verifiedPerWeek"), (point) => point.verified, (value) => formatCount(value, locale), formatCount(totals.verified, locale))}
            </div>
          </>
        )}
      </SettingsSection>
      {usage.members.length > 0 && totals.requests > 0 && (
        <SettingsSection title={t("site.org.usage.members")}>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 pe-3 text-start font-normal">{t("site.org.usage.member")}</th>
                  <th className="py-1 pe-3 text-end font-normal">{t("site.org.usage.requests")}</th>
                  <th className="py-1 pe-3 text-end font-normal">{t("site.org.usage.verified")}</th>
                  <th className="py-1 pe-3 text-end font-normal">{t("site.org.usage.tokens")}</th>
                  <th className="py-1 text-end font-normal">{t("site.org.usage.cost")}</th>
                </tr>
              </thead>
              <tbody>
                {usage.members.map((member) => (
                  <tr key={member.userId} className="border-t border-border/60">
                    <td className="max-w-56 truncate py-1.5 pe-3">{member.name || member.userId}</td>
                    <td className="py-1.5 pe-3 text-end tabular-nums">{formatCount(member.requests, locale)}</td>
                    <td className="py-1.5 pe-3 text-end tabular-nums">{formatCount(member.verified, locale)}</td>
                    <td className="py-1.5 pe-3 text-end tabular-nums">{formatCount(member.tokens, locale)}</td>
                    <td className="py-1.5 text-end tabular-nums">{usd(member.costUsd)}</td>
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
