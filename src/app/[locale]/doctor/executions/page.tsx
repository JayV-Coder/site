import type { Metadata } from "next";
import { LinkSegments, PageHeading } from "@/components/molecules";
import { EmptyText } from "@/components/atoms";
import { doctorList, type Schemas } from "@/modules/doctor/api";
import { filtersHref, readExecutionFilters } from "@/modules/doctor/executions";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../access";
import { DoctorShell } from "../DoctorShell";
import { Unavailable, UnavailablePage } from "../Unavailable";
import { findExecutions } from "./actions";
import { ExecutionFiltersDialog } from "./ExecutionFiltersDialog";
import { ExecutionList } from "./ExecutionList";

type Integration = Schemas["Integration"];

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/executions">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.nav.executions")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Tela 7: os filtros não sensíveis ficam no endereço (dá para compartilhar o link); a busca
 * por termo fica na página, fora do endereço. */
export default async function ExecutionsPage({ params, searchParams }: PageProps<"/[locale]/doctor/executions">) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const access = await requireDoctor(locale, "/doctor/executions");
  const t = await getT(locale);
  if (!access) return <UnavailablePage locale={locale} />;

  const filters = readExecutionFilters(query);
  const since = new Date().toISOString();
  const [page, integrations] = await Promise.all([
    findExecutions(filters, since, null, null),
    doctorList<Integration[]>("/integrations"),
  ]);
  const base = `/${locale}/doctor/executions`;
  const filtered = Object.keys(filters).length > 0;
  const quick = [
    { key: "status" as const, value: "failed", label: t("site.doctor.executions.filter.failed") },
    { key: "environment" as const, value: "prd", label: t("site.doctor.executions.filter.prd") },
    { key: "period" as const, value: "24h", label: t("site.doctor.executions.filter.24h") },
  ];

  return (
    <DoctorShell locale={locale} active={access.active} current="executions">
      <PageHeading title={t("site.doctor.nav.executions")}>
        <LinkSegments label={t("site.doctor.executions.quick")} options={quick.map((item) => ({
          href: filtersHref(base, filters, item.key, item.value), label: item.label, current: filters[item.key] === item.value,
        }))} />
        <ExecutionFiltersDialog base={base} filters={filters}
          integrations={(integrations ?? []).map((integration) => ({ id: integration.id, name: integration.name }))} />
      </PageHeading>
      {page === null && <Unavailable locale={locale} title={t("site.doctor.executions.unavailable")} retry="/doctor/executions" />}
      {page && page.items.length === 0 && !filtered
        ? <EmptyText>{t("site.doctor.executions.empty")}</EmptyText>
        : page && <ExecutionList key={`${JSON.stringify(filters)}-${since}`} filters={filters} since={since} initial={page} />}
    </DoctorShell>
  );
}
