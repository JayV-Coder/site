import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink, PageHeading } from "@/components/molecules";
import { AutoRefresh } from "@/components/organisms/doctor/AutoRefresh";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { doctorGet, doctorList, type Schemas } from "@/modules/doctor/api";
import { clampConfidence, reviewable, verdictOf } from "@/modules/doctor/diagnosis";
import { environmentKey, incidentCode } from "@/modules/doctor/labels";
import { downloadName, formatName, reportState } from "@/modules/doctor/reports";
import type { Key } from "@/modules/i18n";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../../../access";
import { DoctorShell } from "../../../DoctorShell";
import { Unavailable, UnavailablePage } from "../../../Unavailable";
import { ReportForm } from "./ReportForm";
import { ShareList } from "./ShareList";

type IncidentDetail = Schemas["IncidentDetail"];
type DiagnosisSummary = Schemas["DiagnosisSummary"];
type DiagnosisDetail = Schemas["DiagnosisDetail"];
type ReportSummary = Schemas["ReportSummary"];

const OPERATORS = ["owner", "admin", "analyst"];
const HISTORY = 10;

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/incidents/[id]/report">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.report.title")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Tela 19: a pré-visualização do que o relatório leva (o Diagnóstico final mais novo), o
 * formato e as opções para quem gera; o histórico, com download, para todo Papel. */
export default async function ReportPage({ params }: PageProps<"/[locale]/doctor/incidents/[id]/report">) {
  const { locale, id } = await params;
  const access = await requireDoctor(locale, `/doctor/incidents/${id}/report`);
  const t = await getT(locale);
  if (!access) return <UnavailablePage locale={locale} />;
  const [incident, versions, reports] = await Promise.all([
    doctorGet<IncidentDetail>(`/incidents/${encodeURIComponent(id)}`),
    doctorList<DiagnosisSummary[]>(`/incidents/${encodeURIComponent(id)}/diagnoses`),
    doctorList<ReportSummary[]>(`/incidents/${encodeURIComponent(id)}/reports`),
  ]);
  if (incident === "not_found") notFound();
  const back = <BackLink href={`/${locale}/doctor/incidents/${id}`}>{incident ? incidentCode(incident.number) : t("site.doctor.incident.title")}</BackLink>;
  if (incident === null || reports === null) {
    return (
      <DoctorShell locale={locale} active={access.active} current="incidents">
        {back}
        <Unavailable locale={locale} title={t("site.doctor.report.unavailable")} retry={`/doctor/incidents/${id}/report`} />
      </DoctorShell>
    );
  }

  const operator = OPERATORS.includes(access.me.active_role ?? "");
  const current = versions?.find((item) => reviewable(item.status));
  const found = current ? await doctorGet<DiagnosisDetail>(`/diagnoses/${encodeURIComponent(current.id)}`) : null;
  const diagnosis = found === "not_found" ? null : found;
  const verdict = diagnosis ? verdictOf(diagnosis.feedback) : null;
  const when = (iso: string) =>
    `${new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }).format(new Date(iso))} UTC`;
  const confidence = (value: number) => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(clampConfidence(value));
  const environment = environmentKey(incident.environment);
  const recent = reports.slice(0, HISTORY);
  const generating = recent.some((report) => reportState(report.status) === "generating");
  const heading = "font-mono text-xs font-medium tracking-wide text-muted-foreground uppercase";

  return (
    <DoctorShell locale={locale} active={access.active} current="incidents">
      {generating && <AutoRefresh seconds={5} />}
      {back}
      <div className="grid gap-5">
        <PageHeading title={t("site.doctor.report.title")} />
        <div className="grid gap-5 @4xl:grid-cols-2">
          <section aria-labelledby="doctor-report-preview" className="grid content-start gap-3 rounded-lg border border-border bg-card px-4 py-4">
            <h2 id="doctor-report-preview" className="font-mono text-xs text-muted-foreground">
              {t("site.doctor.report.preview", { file: downloadName(incident.number, "pdf") })}
            </h2>
            <div className="grid gap-1">
              <span className={heading}>{t("site.doctor.report.technical")}</span>
              <p className="font-medium break-words">{incidentCode(incident.number)} · {incident.title}</p>
              <p className="text-xs text-muted-foreground">
                {diagnosis
                  ? t("site.doctor.report.meta", { when: when(incident.last_seen_at), version: diagnosis.version, rules: diagnosis.ruleset_version ?? incident.rule_version })
                  : t("site.doctor.report.metaNoDiagnosis", { when: when(incident.last_seen_at), rules: incident.rule_version })}
              </p>
            </div>
            <div className="grid gap-1">
              <span className={heading}>{t("site.doctor.report.summary")}</span>
              <p className="text-sm break-words">{t("site.doctor.report.summaryBody", {
                count: incident.execution_count, integration: incident.integration_name,
                environment: environment ? t(environment) : incident.environment,
              })}</p>
            </div>
            {diagnosis?.status === "inconclusive" ? (
              <div className="grid gap-1">
                <span className={heading}>{t("site.doctor.diagnosis.insufficient")}</span>
                <p className="text-sm">{t("site.doctor.report.insufficientBody")}</p>
              </div>
            ) : (
              <div className="grid gap-1">
                <span className={heading}>
                  {diagnosis?.confidence != null ? t("site.doctor.report.cause", { value: confidence(diagnosis.confidence) }) : t("site.doctor.diagnosis.probableCause")}
                </span>
                <p className="text-sm break-words">{diagnosis?.probable_cause ?? t("site.doctor.report.noDiagnosis")}</p>
              </div>
            )}
            {diagnosis && (
              <>
                <div className="grid gap-1">
                  <span className={heading}>{t("site.doctor.report.evidence")}</span>
                  <p className="text-sm">{t("site.doctor.report.evidenceBody", { count: diagnosis.evidence.length })}</p>
                </div>
                {diagnosis.recommendations.length > 0 && (
                  <div className="grid gap-1">
                    <span className={heading}>{t("site.doctor.diagnosis.recommendations")}</span>
                    <ol className="grid list-decimal gap-1 ps-5 text-sm">
                      {diagnosis.recommendations.map((item) => <li key={item.rank} className="break-words">{item.text}</li>)}
                    </ol>
                  </div>
                )}
                <div className="grid gap-1">
                  <span className={heading}>{t("site.doctor.review.title")}</span>
                  <p className="text-sm">{verdict ? t(`site.doctor.diagnosis.verdict.${verdict}` as Key) : t("site.doctor.report.reviewPending")}</p>
                </div>
              </>
            )}
          </section>

          <div className="grid content-start gap-5">
            {operator
              ? <ReportForm incidentId={incident.id} downloadBase={`/${locale}/doctor/incidents/${incident.id}/report`} />
              : <p className="rounded-md border border-border bg-secondary px-3 py-2 text-sm">{t("site.doctor.report.viewerHint")}</p>}

            {recent.length > 0 && (
              <section aria-labelledby="doctor-report-history" className="grid content-start gap-2">
                <h2 id="doctor-report-history" className="text-sm font-medium">{t("site.doctor.report.history")}</h2>
                <ul className="grid gap-2">
                  {recent.map((report) => {
                    const state = reportState(report.status);
                    const line = report.diagnosis_version === null
                      ? t("site.doctor.report.lineNoDiagnosis", { format: formatName(report.format), when: when(report.created_at) })
                      : t("site.doctor.report.line", { format: formatName(report.format), version: report.diagnosis_version, when: when(report.created_at) });
                    return (
                      <li key={report.id} className="grid gap-2 rounded-lg border border-border bg-card px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm">{line}</span>
                          {state === "ready" ? (
                            <Button asChild size="sm" variant="outline">
                              {/* Rota do servidor: a URL assinada nasce no clique. */}
                              <a href={`/${locale}/doctor/incidents/${incident.id}/report/${report.id}`}>{t("site.doctor.report.downloadShort")}</a>
                            </Button>
                          ) : (
                            <Badge variant={state === "failed" ? "destructive" : "secondary"}>{t(`site.doctor.report.state.${state}`)}</Badge>
                          )}
                        </div>
                        {report.shares.length > 0 && <ShareList reportId={report.id} shares={report.shares} />}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>
    </DoctorShell>
  );
}
