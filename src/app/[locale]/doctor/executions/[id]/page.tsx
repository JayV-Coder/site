import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink, PageHeading } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import { doctorGet, type Schemas } from "@/modules/doctor/api";
import {
  correlationKey, crossKeysText, errorSummary, eventSeverityVariant, eventSource, laneOf, lanes, type Lane,
} from "@/modules/doctor/executions";
import { durationText, environmentKey, executionStatusKey, executionTitle, isOpenIncident, severityKey, severityVariant } from "@/modules/doctor/labels";
import { getT } from "@/modules/i18n/server";
import { cn } from "@/lib/utils";
import { requireDoctor } from "../../access";
import { DoctorShell } from "../../DoctorShell";
import { Unavailable, UnavailablePage } from "../../Unavailable";

type ExecutionDetail = Schemas["ExecutionDetail"];

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/executions/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.execution.title")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Tela 8: a Timeline da Execução. Cada Evento leva ao original (Tela 9); o que uma Regra usou
 * como prova aparece destacado, com o código da Regra. Com mais de um sistema, raias (#40). */
export default async function ExecutionPage({ params }: PageProps<"/[locale]/doctor/executions/[id]">) {
  const { locale, id } = await params;
  const access = await requireDoctor(locale, `/doctor/executions/${id}`);
  const t = await getT(locale);
  if (!access) return <UnavailablePage locale={locale} />;
  const execution = await doctorGet<ExecutionDetail>(`/executions/${encodeURIComponent(id)}`);
  if (execution === "not_found") notFound();

  const back = <BackLink href={`/${locale}/doctor/executions`}>{t("site.doctor.nav.executions")}</BackLink>;
  if (execution === null) {
    return (
      <DoctorShell locale={locale} active={access.active} current="executions">
        {back}
        <Unavailable locale={locale} title={t("site.doctor.execution.unavailable")} retry={`/doctor/executions/${id}`} />
      </DoctorShell>
    );
  }

  const keys = execution.correlation_keys;
  // Resolvido ou descartado não é problema ativo.
  const incident = execution.incident && isOpenIncident(execution.incident.status) ? execution.incident : null;
  const systems = lanes(execution.events);
  const laned = systems.length > 1;
  const laneName = (lane: Lane) => ("name" in lane ? lane.name : t(lane.key));
  const laneOfSystem = (system: string) => {
    const lane = systems.find((item) => item.system === system);
    return lane ? laneName(lane) : system;
  };
  const status = executionStatusKey(execution.status);
  const environment = environmentKey(execution.environment);
  const duration = durationText(t, locale, execution.duration_ms);
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" });
  const title = executionTitle(execution.id, keys) ?? t("site.doctor.incident.execution", { id: execution.id.slice(0, 8) });
  const severity = incident ? severityKey(incident.severity) : null;

  return (
    <DoctorShell locale={locale} active={access.active} current="executions">
      {back}
      <div className="grid gap-5">
        <div className="grid gap-2">
          {incident && <div><Badge variant={severityVariant(incident.severity)}>{t("site.doctor.incident.title")}</Badge></div>}
          <PageHeading title={title} />
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">{t("site.doctor.execution.integration")}</dt>
          <dd className="break-words">{execution.integration_name} · {environment ? t(environment) : execution.environment}</dd>
          <dt className="text-muted-foreground">{t("site.doctor.execution.statusLabel")}</dt>
          <dd>{status ? t(status) : execution.status}{execution.low_confidence && ` ${t("site.doctor.execution.weak")}`}</dd>
          {keys.trace_id?.[0] && (<><dt className="text-muted-foreground">{t("site.doctor.execution.trace")}</dt><dd className="font-mono text-xs leading-5 break-all">{keys.trace_id.join(", ")}</dd></>)}
          {keys.cross_system?.[0] && (<><dt className="text-muted-foreground">{t("site.doctor.execution.crossSystem")}</dt><dd className="font-mono text-xs leading-5 break-all">{crossKeysText(keys.cross_system)}</dd></>)}
          {keys.business_reference?.[0] && (<><dt className="text-muted-foreground">{t("site.doctor.execution.reference")}</dt><dd className="font-mono text-xs leading-5 break-all">{keys.business_reference.join(", ")}</dd></>)}
          <dt className="text-muted-foreground">{t("site.doctor.execution.duration")}</dt><dd>{duration}</dd>
        </dl>
        {incident && (
          <Link href={`/${locale}/doctor/incidents/${incident.id}`}
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm transition-colors hover:bg-destructive/15">
            <strong className="break-words">{incident.title}</strong> · {severity ? t(severity) : incident.severity}
          </Link>
        )}

        <section aria-labelledby="doctor-timeline" className="grid gap-2">
          <h2 id="doctor-timeline" className="text-sm font-medium">{t("site.doctor.execution.correlated", { count: execution.events.length })}</h2>
          {laned && (
            <div aria-hidden="true" className="flex gap-1 ps-1 font-mono text-[0.65rem] text-muted-foreground">
              {systems.map((lane) => <span key={lane.system} title={laneName(lane)} className="w-6 truncate text-center">{lane.short}</span>)}
            </div>
          )}
          <ol aria-label={laned ? t("site.doctor.execution.timelineLanes", { systems: systems.map(laneName).join(", ") }) : t("site.doctor.execution.timeline")}
            className="grid gap-2">
            {execution.events.map((event) => {
              const flagged = event.rule_codes.length > 0;
              const mine = laneOf(event);
              const variant = eventSeverityVariant(event.severity);
              const summary = flagged ? errorSummary(event.error) : null;
              const dot = <span className={cn("inline-block size-2.5 rounded-full",
                variant === "destructive" ? "bg-destructive" : variant === "warning" ? "bg-warning" : "bg-muted-foreground/50")} />;
              return (
                <li key={event.id} className="flex items-stretch gap-2">
                  <span aria-hidden="true" className="flex flex-none gap-1 pt-4 ps-1">
                    {laned ? systems.map((lane) => <span key={lane.system} className="flex w-6 justify-center">{lane.system === mine && dot}</span>) : dot}
                  </span>
                  <Link href={`/${locale}/doctor/events/${event.id}?at=${encodeURIComponent(event.timestamp)}`}
                    className={cn("grid min-w-0 flex-1 gap-1 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-secondary/40",
                      flagged ? "border-destructive/40" : "border-border")}>
                    <span className="text-sm wrap-anywhere">{eventSource(event.source) ?? t("site.doctor.event.unknownSource")} · {event.operation}</span>
                    {summary && <span className="font-mono text-xs text-destructive">{summary}</span>}
                    <span className="text-xs text-muted-foreground">
                      {laned && `${laneOfSystem(mine)} · `}
                      {time.format(new Date(event.timestamp))} UTC · {event.severity} · {t(correlationKey(event.correlated_by))}
                    </span>
                    {flagged && <span className="flex flex-wrap gap-1">{event.rule_codes.map((code) => <Badge key={code} variant="outline" mono>{code}</Badge>)}</span>}
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        {execution.rules.length > 0 && (
          <section aria-labelledby="doctor-execution-rules" className="grid gap-2">
            <h2 id="doctor-execution-rules" className="text-sm font-medium">{t("site.doctor.execution.rules")}</h2>
            <ul className="grid gap-2">
              {execution.rules.map((rule) => (
                <li key={`${rule.rule_code}-${rule.rule_version}`} className="grid gap-1 rounded-lg border border-border bg-card px-4 py-3">
                  <span className="text-sm"><Badge variant="outline" mono>{rule.rule_code}</Badge> <span className="font-mono text-xs">{rule.category}</span></span>
                  <span className="text-xs text-muted-foreground">{t("site.doctor.execution.ruleLine", { description: rule.description, version: rule.rule_version })}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="text-xs text-muted-foreground">{t("site.doctor.execution.rulesNote")}</p>
      </div>
    </DoctorShell>
  );
}
