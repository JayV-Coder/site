import type { Metadata } from "next";
import { EmptyText } from "@/components/atoms";
import { LinkSegments, PageHeading } from "@/components/molecules";
import { getT } from "@/modules/i18n/server";
import { PERIODS, periodOf, viewOf, type OverviewView, type Period } from "@/modules/overview";
import { requireAccess } from "./access";
import { DashboardShell } from "./DashboardShell";
import { loadMyOverview, loadSystemOverview } from "./overview/data";
import { formatters } from "./overview/format";
import { MyOverviewBoard } from "./overview/MyOverviewBoard";
import { SystemOverviewBoard } from "./overview/SystemOverviewBoard";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.dashboard.title")} · JayV`, robots: { index: false } };
}

/** O Dashboard, onde o painel abre (e para onde o login leva): o uso do app
 * de quem entrou e, para o admin do sistema, o uso de todas as contas —
 * acessos, pedidos, chats, tokens e custo. O período (`?days=7|30|90`) e, para
 * o admin, a visão (`?view=me`) moram no endereço. */
export default async function DashboardPage({ params, searchParams }: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  const query = await searchParams;
  const access = await requireAccess(locale, "/dashboard");
  const t = await getT(locale);
  const days = periodOf(query.days);
  const view = viewOf(query.view, access.admin);
  const base = `/${locale}/dashboard`;
  const href = (next: { days?: Period; view?: OverviewView }) => {
    const search = new URLSearchParams();
    const wantedDays = next.days ?? days;
    if (wantedDays !== 30) search.set("days", String(wantedDays));
    if ((next.view ?? view) === "me" && access.admin) search.set("view", "me");
    const text = search.toString();
    return text ? `${base}?${text}` : base;
  };
  const system = view === "system" ? await loadSystemOverview(days) : null;
  const mine = view === "me" ? await loadMyOverview(days) : null;
  const data = system ?? mine;
  const since = data ? t("site.overview.since", { date: formatters(locale, data.zone).longDay(data.from), zone: data.zone }) : null;

  return (
    <DashboardShell locale={locale} access={access} current="overview">
      <PageHeading
        eyebrow={view === "system" ? t("admin.eyebrow") : t("site.account.title")}
        title={t("site.dashboard.title")}
        description={t(view === "system" ? "site.overview.description.system" : "site.overview.description.me")}
      >
        {access.admin && (
          <LinkSegments label={t("site.overview.view")} options={(["system", "me"] as const).map((option) => ({
            href: href({ view: option }), label: t(`site.overview.view.${option}`), current: option === view,
          }))} />
        )}
        <LinkSegments label={t("site.overview.period")} options={PERIODS.map((option) => ({
          href: href({ days: option }), label: t("site.overview.period.days", { count: option }), current: option === days,
        }))} />
      </PageHeading>
      {since && <p className="-mt-3 mb-5 text-xs text-muted-foreground">{since}</p>}
      {system && <SystemOverviewBoard locale={locale} data={system} />}
      {mine && <MyOverviewBoard locale={locale} data={mine} />}
      {!data && <EmptyText>{t("site.overview.failed")}</EmptyText>}
    </DashboardShell>
  );
}
