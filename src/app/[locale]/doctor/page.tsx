import type { Metadata } from "next";
import { DailyBars, LinkSegments, PageHeading, StatTile } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import { doctorList, type Schemas } from "@/modules/doctor/api";
import {
  ageParts, bucketLabel, categoryKey, changeArrow, ENVIRONMENTS, environmentKey, incidentCode, mttrParts, peak, PERIODS,
  severityKey, severityVariant, statusKey,
} from "@/modules/doctor/labels";
import type { Key } from "@/modules/i18n";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "./access";
import { CategoryBars } from "./CategoryBars";
import { DoctorShell } from "./DoctorShell";
import { Unavailable, UnavailablePage } from "./Unavailable";

type Dashboard = Schemas["Dashboard"];
type Period = (typeof PERIODS)[number];
type Environment = (typeof ENVIRONMENTS)[number];

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.dashboard.title")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

function href(locale: string, period: Period, environment: Environment | null) {
  const query = new URLSearchParams();
  if (period !== "24h") query.set("period", period);
  if (environment) query.set("environment", environment);
  const text = query.toString();
  return `/${locale}/doctor${text ? `?${text}` : ""}`;
}

/** O painel da Organização ativa: Execuções, taxa de erro, Incidentes abertos e MTTR do
 * período, as falhas no tempo e por categoria, e os Incidentes recentes. Período e ambiente
 * moram no endereço, para dar para compartilhar o recorte. */
export default async function DoctorPage({ params, searchParams }: PageProps<"/[locale]/doctor">) {
  const { locale } = await params;
  const query = await searchParams;
  const period = PERIODS.find((value) => value === query.period) ?? "24h";
  const environment = ENVIRONMENTS.find((value) => value === query.environment) ?? null;
  const access = await requireDoctor(locale, "/doctor");
  const t = await getT(locale);
  if (!access) return <UnavailablePage locale={locale} />;

  const search = new URLSearchParams({ period });
  if (environment) search.set("environment", environment);
  const board = await doctorList<Dashboard>(`/dashboard?${search.toString()}`);

  const number = new Intl.NumberFormat(locale);
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const label = (key: Key | null, fallback: string) => (key ? t(key) : fallback);
  const age = (iso: string, now: Date) => {
    const { unit, count } = ageParts(iso, now);
    return t(`site.doctor.age.${unit}`, { count });
  };
  const mttr = (minutes: number | null | undefined) => {
    const parts = mttrParts(minutes);
    if (!parts) return "—";
    return "hours" in parts ? t("site.doctor.duration.hoursMinutes", parts) : t("site.doctor.age.minutes", { count: parts.minutes });
  };
  const change = (value: number | null | undefined, against: string) =>
    value === null || value === undefined ? undefined : `${changeArrow(value)} ${percent.format(Math.abs(value))} ${against}`;

  return (
    <DoctorShell locale={locale} active={access.active} current="overview">
      <PageHeading title={t("site.doctor.dashboard.title")}>
        <LinkSegments label={t("site.doctor.dashboard.period")}
          options={PERIODS.map((value) => ({ href: href(locale, value, environment), label: t(`site.doctor.dashboard.period.${value}`), current: value === period }))} />
        <LinkSegments label={t("site.doctor.dashboard.environment")}
          options={ENVIRONMENTS.map((value) => ({
            href: href(locale, period, value === environment ? null : value), label: t(`site.doctor.env.${value}`), current: value === environment,
          }))} />
      </PageHeading>
      {!board ? <Unavailable locale={locale} title={t("site.doctor.dashboard.unavailable")} /> : (() => {
        const now = new Date();
        const previous = period === "24h" ? t("site.doctor.dashboard.vsPrevious24h") : t("site.doctor.dashboard.vsPrevious");
        const critical = board.critical_incident;
        const top = peak(board.failures);
        const noRate = board.error_rate.value === null || board.error_rate.value === undefined;
        const failuresTitle = board.bucket === "hour" ? t("site.doctor.dashboard.failuresByHour") : t("site.doctor.dashboard.failuresByDay");
        return (
          <div className="grid gap-5">
            {critical && (
              <section aria-label={t("site.doctor.dashboard.criticalLabel")} className="grid gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {t("site.doctor.dashboard.critical", {
                      code: incidentCode(critical.number), status: label(statusKey(critical.status), critical.status),
                      age: age(critical.first_seen_at, now), last: age(critical.last_seen_at, now),
                    })}
                  </span>
                  <Badge variant={severityVariant(critical.severity)}>{label(severityKey(critical.severity), critical.severity)}</Badge>
                </div>
                <strong className="text-base font-semibold break-words">{critical.title}</strong>
                <span className="text-xs text-muted-foreground">{critical.integration_name} · {label(environmentKey(critical.environment), critical.environment)}</span>
              </section>
            )}

            <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
              <StatTile label={t("site.doctor.dashboard.executions")} value={number.format(board.executions.value ?? 0)} hint={change(board.executions.change, previous)} />
              <StatTile label={t("site.doctor.dashboard.errorRate")}
                // Sem Execução não há taxa: 0% passaria a ideia de que está tudo bem.
                value={noRate ? "—" : percent.format(board.error_rate.value ?? 0)}
                hint={noRate ? t("site.doctor.dashboard.noExecutions") : change(board.error_rate.change, previous)} />
              <StatTile label={t("site.doctor.dashboard.openIncidents")} value={number.format(board.open_incidents)} />
              <StatTile label={t("site.doctor.dashboard.mttr")} value={mttr(board.mttr_minutes.value)}
                hint={board.mttr_vs_baseline !== null && board.mttr_vs_baseline !== undefined
                  ? change(board.mttr_vs_baseline, t("site.doctor.dashboard.vsBaseline"))
                  : change(board.mttr_minutes.change, previous)} />
            </div>

            <div className="grid gap-3 @3xl:grid-cols-2">
              <DailyBars title={failuresTitle}
                summary={top ? t("site.doctor.dashboard.peak", { label: bucketLabel(top.start, board.bucket) }) : t("site.doctor.dashboard.noFailures")}
                peakLabel={number.format(top?.failed ?? 0)} tableLabel={t("site.doctor.dashboard.chartTable")}
                dayLabel={t("site.doctor.dashboard.bucketStart")} valueLabel={t("site.doctor.dashboard.failures")}
                points={board.failures.map((bucket) => ({ label: bucketLabel(bucket.start, board.bucket), value: bucket.failed, shown: number.format(bucket.failed) }))} />
              <CategoryBars title={t("site.doctor.dashboard.byCategory")} empty={t("site.doctor.dashboard.noFailures")}
                items={board.failures_by_category.map((item) => ({ label: label(categoryKey(item.category), item.category), count: item.count, shown: number.format(item.count) }))} />
            </div>

            {board.recent_incidents.length > 0 && (
              <section aria-labelledby="doctor-recent" className="grid gap-2">
                <h2 id="doctor-recent" className="text-sm font-medium">{t("site.doctor.dashboard.recent")}</h2>
                <ul className="grid gap-2">
                  {board.recent_incidents.map((incident) => (
                    <li key={incident.id} className="grid gap-1 rounded-lg border border-border bg-card px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{incidentCode(incident.number)} · {label(statusKey(incident.status), incident.status)}</span>
                        <Badge variant={severityVariant(incident.severity)}>{label(severityKey(incident.severity), incident.severity)}</Badge>
                      </div>
                      <span className="text-sm font-medium break-words">{incident.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {incident.integration_name} · {t("site.doctor.dashboard.executionCount", { count: incident.execution_count })}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <p className="text-xs text-muted-foreground">
              {t("site.doctor.dashboard.footer")}
              {board.mttr_baseline_minutes ? ` · ${t("site.doctor.dashboard.baseline", { value: mttr(board.mttr_baseline_minutes) })}` : ""}
            </p>
          </div>
        );
      })()}
    </DoctorShell>
  );
}
