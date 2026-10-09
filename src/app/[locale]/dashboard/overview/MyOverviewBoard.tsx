import { EmptyText } from "@/components/atoms";
import { DailyBars, SettingsSection, StatTile } from "@/components/molecules";
import { getT } from "@/modules/i18n/server";
import type { MyOverview } from "@/modules/overview";
import { formatters } from "./format";
import { OverviewFacts, OverviewTable } from "./OverviewTable";

/** O uso do app da própria conta no período: os números de destaque, os
 * pedidos e os tokens de cada dia, o total desde o início, os modelos, cada
 * ambiente e os chats recentes. */
export async function MyOverviewBoard({ locale, data }: { locale: string; data: MyOverview }) {
  const t = await getT(locale);
  const f = formatters(locale, data.zone);
  const tokens = data.usage.inputTokens + data.usage.outputTokens;
  const chart = (title: string, values: { day: string; value: number }[], show: (value: number) => string) => {
    const total = values.reduce((sum, item) => sum + item.value, 0);
    return (
      <DailyBars
        title={title}
        summary={t("site.overview.chart.total", { total: show(total) })}
        peakLabel={t("site.overview.chart.peak", { value: show(Math.max(0, ...values.map((item) => item.value))) })}
        tableLabel={t("site.overview.chart.table")}
        dayLabel={t("site.overview.column.day")}
        valueLabel={title}
        points={values.map((item) => ({ label: f.day(item.day), value: item.value, shown: show(item.value) }))}
      />
    );
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
        <StatTile label={t("site.overview.requests")} value={f.number(data.requests.total)}
          hint={t("site.overview.requests.hint", { answered: f.number(data.requests.answered), failed: f.number(data.requests.failed), blocked: f.number(data.requests.blocked) })} />
        <StatTile label={t("site.overview.tokens")} value={f.compact(tokens)}
          hint={t("site.overview.tokens.hint", { input: f.compact(data.usage.inputTokens), output: f.compact(data.usage.outputTokens), cache: f.compact(data.usage.cacheTokens) })} />
        <StatTile label={t("site.overview.cost")} value={f.money(data.usage.costUsd)}
          hint={t("site.overview.cost.hint", { calls: f.number(data.usage.calls), jev: f.number(data.usage.jevCalls) })} />
        <StatTile label={t("site.overview.jev")} value={f.number(data.jev.today)}
          hint={data.jev.limit === null ? t("site.overview.jev.unlimited") : t("site.overview.jev.limit", { limit: f.number(data.jev.limit) })} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 @3xl:grid-cols-2">
        {chart(t("site.overview.chart.requests"), data.daily.map((day) => ({ day: day.day, value: day.requests })), f.number)}
        {chart(t("site.overview.chart.tokens"), data.daily.map((day) => ({ day: day.day, value: day.tokens })), f.compact)}
      </div>

      <SettingsSection title={t("site.overview.totals")}>
        <OverviewFacts items={[
          [t("site.overview.label.projects"), f.number(data.totals.projects)],
          [t("site.overview.label.chats"), f.number(data.totals.chats)],
          [t("site.overview.label.requests"), f.number(data.totals.requests)],
          [t("site.overview.label.organizations"), f.number(data.totals.organizations)],
          [t("site.overview.label.devices"), f.number(data.usage.devices)],
          [t("site.overview.label.avgCall"), t("site.overview.seconds", { value: f.seconds(data.usage.avgMs) })],
        ]} />
      </SettingsSection>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 @4xl:grid-cols-2">
        <SettingsSection title={t("site.overview.models")}>
          {data.models.length === 0 ? <EmptyText>{t("site.overview.models.empty")}</EmptyText> : (
            <OverviewTable
              columns={[{ label: t("site.overview.column.model") }, { label: t("site.overview.column.calls"), numeric: true }, { label: t("site.overview.column.tokens"), numeric: true }, { label: t("site.overview.column.cost"), numeric: true }]}
              rows={data.models.map((model) => ({
                key: model.model,
                cells: [<span key="model" className="font-mono text-xs break-all">{model.model}</span>, f.number(model.calls), f.compact(model.tokens), f.money(model.costUsd)],
              }))} />
          )}
        </SettingsSection>

        <SettingsSection title={t("site.overview.environments")} description={t("site.overview.environments.description")}>
          <OverviewTable
            columns={[{ label: t("site.overview.column.environment") }, { label: t("site.overview.column.requests"), numeric: true }, { label: t("site.overview.column.tokens"), numeric: true }, { label: t("site.overview.column.cost"), numeric: true }]}
            rows={data.environments.map((environment) => ({
              key: environment.id,
              cells: [
                <span key="name" className="block truncate">{environment.name ?? t("site.users.environment.personal")}</span>,
                f.number(environment.requests), f.compact(environment.tokens), f.money(environment.costUsd),
              ],
            }))} />
        </SettingsSection>
      </div>

      <SettingsSection title={t("site.overview.chats")}>
        {data.recentChats.length === 0 ? <EmptyText>{t("site.overview.chats.empty")}</EmptyText> : (
          <ul className="grid gap-2">
            {data.recentChats.map((chat) => (
              <li key={chat.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border/60 px-3 py-2.5">
                <span className="min-w-0 basis-full truncate text-sm font-medium @lg:basis-auto @lg:flex-1">
                  {chat.title || t("site.overview.chats.untitled")}
                  {chat.code && <span className="ms-2 font-mono text-xs font-normal text-muted-foreground">{chat.code}</span>}
                </span>
                <span className="min-w-0 truncate text-xs text-muted-foreground">
                  {[chat.project, chat.environmentName ?? t("site.users.environment.personal")].filter(Boolean).join(" · ")}
                </span>
                <span className="text-xs whitespace-nowrap text-muted-foreground">{f.moment(chat.updatedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>
    </div>
  );
}
