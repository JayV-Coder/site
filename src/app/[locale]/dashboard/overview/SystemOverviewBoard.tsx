import Link from "next/link";
import { EmptyText, UserAvatar } from "@/components/atoms";
import { DailyBars, SettingsSection, StatTile } from "@/components/molecules";
import { getT } from "@/modules/i18n/server";
import { personName, type SystemDay, type SystemOverview } from "@/modules/overview";
import { formatters } from "./format";
import { OverviewFacts, OverviewTable } from "./OverviewTable";

/** O uso do sistema inteiro no período, para o admin: contas e acessos, quem
 * usou o app, pedidos e chats, tokens e custo, quem mais usou, modelos,
 * planos, organizações e as contas mais novas. Cada conta leva à página dela
 * em Usuários. */
export async function SystemOverviewBoard({ locale, data }: { locale: string; data: SystemOverview }) {
  const t = await getT(locale);
  const f = formatters(locale, data.zone);
  const users = `/${locale}/dashboard/users`;
  const chart = (title: string, pick: (day: SystemDay) => number, show: (value: number) => string, summed = true) => {
    const values = data.daily.map(pick);
    const total = values.reduce((sum, value) => sum + value, 0);
    return (
      <DailyBars
        title={title}
        summary={summed ? t("site.overview.chart.total", { total: show(total) }) : ""}
        peakLabel={t("site.overview.chart.peak", { value: show(Math.max(0, ...values)) })}
        tableLabel={t("site.overview.chart.table")}
        dayLabel={t("site.overview.column.day")}
        valueLabel={title}
        points={data.daily.map((day, index) => ({ label: f.day(day.day), value: values[index], shown: show(values[index]) }))}
      />
    );
  };
  const account = (user: { userId: string; displayName: string | null; username: string | null; email: string | null; avatarUrl: string | null }) => (
    <Link href={`${users}/${user.userId}`} className="flex min-w-0 items-center gap-2.5 rounded-xs outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
      <UserAvatar name={personName(user)} src={user.avatarUrl} className="size-7 text-xs" />
      <span className="grid min-w-0">
        <span className="truncate text-sm font-medium">{personName(user)}</span>
        {user.email && personName(user) !== user.email && <span className="truncate text-xs text-muted-foreground">{user.email}</span>}
      </span>
    </Link>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-3">
        <StatTile label={t("site.overview.system.accounts")} value={f.number(data.users.total)}
          hint={t("site.overview.system.accounts.hint", { count: f.number(data.users.new) })} />
        <StatTile label={t("site.overview.system.active")} value={f.number(data.access.activePeriod)}
          hint={t("site.overview.system.active.hint", { day: f.number(data.access.activeDay), week: f.number(data.access.activeWeek) })} />
        <StatTile label={t("site.overview.system.signIns")} value={f.number(data.access.sessions)}
          hint={t("site.overview.system.signIns.hint", { users: f.number(data.users.signedInPeriod), open: f.number(data.access.openSessions) })} />
        <StatTile label={t("site.overview.requests")} value={f.number(data.activity.requests)}
          hint={t("site.overview.requests.hint", { answered: f.number(data.activity.answered), failed: f.number(data.activity.failed), blocked: f.number(data.activity.blocked) })} />
        <StatTile label={t("site.overview.tokens")} value={f.compact(data.usage.tokens)}
          hint={t("site.overview.tokens.cache", { cache: f.compact(data.usage.cacheTokens) })} />
        <StatTile label={t("site.overview.cost")} value={f.money(data.usage.costUsd)}
          hint={t("site.overview.cost.hint", { calls: f.number(data.usage.calls), jev: f.number(data.usage.jevCalls) })} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 @3xl:grid-cols-2">
        {chart(t("site.overview.chart.sessions"), (day) => day.sessions, f.number)}
        {chart(t("site.overview.chart.active"), (day) => day.active, f.number, false)}
        {chart(t("site.overview.chart.requests"), (day) => day.requests, f.number)}
        {chart(t("site.overview.chart.signups"), (day) => day.signups, f.number)}
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">{t("site.overview.system.sessionsNote")}</p>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 @4xl:grid-cols-2">
        <SettingsSection title={t("site.overview.system.access")}>
          <OverviewFacts items={[
            [t("site.overview.system.confirmed"), f.number(data.users.confirmed)],
            [t("site.overview.system.mfa"), f.number(data.users.mfa)],
            [t("site.overview.system.banned"), f.number(data.users.banned)],
            [t("site.overview.system.admins"), f.number(data.users.admins)],
            [t("site.overview.system.signedInDay"), f.number(data.users.signedInDay)],
            [t("site.overview.system.signedInWeek"), f.number(data.users.signedInWeek)],
          ]} />
        </SettingsSection>

        <SettingsSection title={t("site.overview.system.activity")}>
          <OverviewFacts items={[
            [t("site.overview.label.projects"), f.number(data.activity.projects)],
            [t("site.overview.label.chats"), f.number(data.activity.chats)],
            [t("site.overview.system.chatsNew"), f.number(data.activity.chatsNew)],
            [t("site.overview.system.messages"), f.number(data.activity.messages)],
            [t("site.overview.system.orgRequests"), f.number(data.activity.organizationRequests)],
            [t("site.overview.system.failures"), f.number(data.usage.failures)],
          ]} />
        </SettingsSection>
      </div>

      <SettingsSection title={t("site.overview.system.topUsers")}>
        {data.topUsers.length === 0 ? <EmptyText>{t("site.overview.system.topUsers.empty")}</EmptyText> : (
          <OverviewTable
            columns={[
              { label: t("site.overview.column.account") }, { label: t("site.overview.column.requests"), numeric: true },
              { label: t("site.overview.column.tokens"), numeric: true }, { label: t("site.overview.column.cost"), numeric: true },
              { label: t("site.overview.column.lastSignIn"), numeric: true },
            ]}
            rows={data.topUsers.map((user) => ({
              key: user.userId,
              cells: [account(user), f.number(user.requests), f.compact(user.tokens), f.money(user.costUsd), <span key="seen" className="text-xs text-muted-foreground">{f.moment(user.lastSignInAt)}</span>],
            }))} />
        )}
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

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-5">
          <SettingsSection title={t("site.overview.system.plans")}>
            <ul className="grid gap-2">
              {data.plans.map((plan) => (
                <li key={plan.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{plan.name ?? plan.key} <span className="font-mono text-xs text-muted-foreground">{plan.key}</span></span>
                  <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">{t("site.overview.system.plans.users", { count: plan.users })}</span>
                </li>
              ))}
            </ul>
          </SettingsSection>

          <SettingsSection title={t("site.overview.system.organizations")}>
            <OverviewFacts items={[
              [t("site.overview.label.organizations"), f.number(data.organizations.total)],
              [t("site.overview.system.members"), f.number(data.organizations.members)],
              [t("site.overview.system.repositories"), f.number(data.organizations.repositories)],
              [t("site.overview.system.jevCalls"), f.number(data.jev.calls)],
              [t("site.overview.system.jevUsers"), f.number(data.jev.users)],
            ]} />
          </SettingsSection>
        </div>
      </div>

      <SettingsSection title={t("site.overview.system.recent")}>
        <ul className="grid gap-2">
          {data.recentUsers.map((user) => (
            <li key={user.userId} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border/60 px-3 py-2">
              <span className="min-w-0 basis-full @lg:basis-auto @lg:flex-1">{account(user)}</span>
              <span className="text-xs whitespace-nowrap text-muted-foreground">{t("site.overview.system.joined", { date: f.moment(user.createdAt) })}</span>
              <span className="text-xs whitespace-nowrap text-muted-foreground">
                {user.lastSignInAt ? t("site.overview.system.seen", { date: f.moment(user.lastSignInAt) }) : t("site.overview.system.never")}
              </span>
            </li>
          ))}
        </ul>
      </SettingsSection>
    </div>
  );
}
