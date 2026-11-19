import type { Metadata } from "next";
import { LinkSegments, PageHeading } from "@/components/molecules";
import { LiveRefresh } from "@/components/organisms/doctor/LiveRefresh";
import { EmptyText } from "@/components/atoms";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../access";
import { DoctorShell } from "../DoctorShell";
import { Unavailable, UnavailablePage } from "../Unavailable";
import { findIncidents, type IncidentFilters } from "./actions";
import { IncidentList } from "./IncidentList";

const STATUS_FILTERS = ["open", "investigating", "resolved"] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/incidents">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.nav.incidents")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Tela 5: filtros de status (com a contagem) e de críticos no endereço, busca e cards. */
export default async function IncidentsPage({ params, searchParams }: PageProps<"/[locale]/doctor/incidents">) {
  const { locale } = await params;
  const query = await searchParams;
  const access = await requireDoctor(locale, "/doctor/incidents");
  const t = await getT(locale);
  if (!access) return <UnavailablePage locale={locale} />;

  const status = STATUS_FILTERS.find((value) => value === query.status);
  const critical = query.severity === "critical";
  const filters: IncidentFilters = { status: status ? [status] : [], severity: critical ? ["critical"] : [] };
  const page = await findIncidents(filters, null, null);
  const href = (change: { status?: string | null; severity?: string | null }) => {
    const next = new URLSearchParams();
    const nextStatus = change.status === undefined ? status : change.status;
    const nextSeverity = change.severity === undefined ? (critical ? "critical" : null) : change.severity;
    if (nextStatus) next.set("status", nextStatus);
    if (nextSeverity) next.set("severity", nextSeverity);
    const text = next.toString();
    return `/${locale}/doctor/incidents${text ? `?${text}` : ""}`;
  };
  const number = new Intl.NumberFormat(locale);

  return (
    <DoctorShell locale={locale} active={access.active} current="incidents">
      <LiveRefresh tenantId={access.active.id} tables={["incidents"]} />
      <PageHeading title={t("site.doctor.nav.incidents")}>
        <LinkSegments label={t("site.doctor.incidents.statusFilter")}
          options={STATUS_FILTERS.map((value) => ({
            href: href({ status: status === value ? null : value }),
            label: `${t(`site.doctor.incidents.filter.${value}`)} ${number.format(page?.counts[value] ?? 0)}`,
            current: status === value,
          }))} />
        <LinkSegments label={t("site.doctor.incidents.severityFilter")}
          options={[{ href: href({ severity: critical ? null : "critical" }), label: t("site.doctor.incidents.filter.critical"), current: critical }]} />
      </PageHeading>
      {page === null && <Unavailable locale={locale} title={t("site.doctor.incidents.unavailable")} retry="/doctor/incidents" />}
      {page && Object.keys(page.counts).length === 0 && <EmptyText>{t("site.doctor.incidents.empty")}</EmptyText>}
      {page && Object.keys(page.counts).length > 0 && <IncidentList key={JSON.stringify(filters)} filters={filters} initial={page} />}
    </DoctorShell>
  );
}
