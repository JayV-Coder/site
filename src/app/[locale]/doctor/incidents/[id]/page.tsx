import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink, PageHeading } from "@/components/molecules";
import { AutoRefresh } from "@/components/organisms/doctor/AutoRefresh";
import { Badge } from "@/components/ui/badge";
import { doctorGet, doctorList, type Schemas } from "@/modules/doctor/api";
import {
  durationParts, environmentKey, executionStatusKey, executionTitle, incidentCode, severityKey, severityVariant, statusKey,
} from "@/modules/doctor/labels";
import type { Key } from "@/modules/i18n";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../../access";
import { DoctorShell } from "../../DoctorShell";
import { Unavailable, UnavailablePage } from "../../Unavailable";
import { CommentForm } from "./CommentForm";
import { IncidentControls } from "./IncidentControls";

type IncidentDetail = Schemas["IncidentDetail"];
type Comment = Schemas["Comment"];

const OPERATORS = ["owner", "admin", "analyst"];

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/incidents/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.incident.title")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Tela 6, primeira parte: o Incidente, as Regras que dispararam, as Execuções, o histórico e
 * a conversa. O Diagnóstico, a revisão, os chamados e o relatório chegam no bloco seguinte. */
export default async function IncidentPage({ params }: PageProps<"/[locale]/doctor/incidents/[id]">) {
  const { locale, id } = await params;
  const access = await requireDoctor(locale, `/doctor/incidents/${id}`);
  const t = await getT(locale);
  if (!access) return <UnavailablePage locale={locale} />;
  const [incident, comments] = await Promise.all([
    doctorGet<IncidentDetail>(`/incidents/${encodeURIComponent(id)}`),
    doctorList<Comment[]>(`/incidents/${encodeURIComponent(id)}/comments`),
  ]);
  if (incident === "not_found") notFound();

  const { me } = access;
  const operator = OPERATORS.includes(me.active_role ?? "");
  const label = (key: Key | null, fallback: string) => (key ? t(key) : fallback);
  const when = (iso: string) =>
    `${new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }).format(new Date(iso))} UTC`;
  const duration = (ms: number) => {
    const parts = durationParts(ms);
    if (parts.unit === "ms") return t("site.doctor.duration.ms", { value: parts.value });
    if (parts.unit === "s") return t("site.doctor.duration.seconds", { value: new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(parts.value) });
    return t("site.doctor.duration.minutesSeconds", { minutes: parts.minutes, seconds: parts.seconds });
  };
  const who = (actor: string | null) => (actor === null ? t("site.doctor.incident.platform") : actor === me.id ? t("site.doctor.incident.you") : t("site.doctor.incident.member"));

  return (
    <DoctorShell locale={locale} active={access.active} current="incidents">
      <AutoRefresh />
      <BackLink href={`/${locale}/doctor/incidents`}>{t("site.doctor.nav.incidents")}</BackLink>
      {incident === null ? <Unavailable locale={locale} title={t("site.doctor.incident.unavailable")} retry={`/doctor/incidents/${id}`} /> : (
        <div className="grid gap-5">
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={severityVariant(incident.severity)}>{label(severityKey(incident.severity), incident.severity)}</Badge>
              <Badge variant="secondary">{label(statusKey(incident.status), incident.status)}</Badge>
              <Badge variant="outline">{incident.integration_name} · {label(environmentKey(incident.environment), incident.environment)}</Badge>
            </div>
            <PageHeading title={`${incidentCode(incident.number)} · ${incident.title}`} />
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">{t("site.doctor.dashboard.executions")}</dt><dd>{new Intl.NumberFormat(locale).format(incident.execution_count)}</dd>
            <dt className="text-muted-foreground">{t("site.doctor.incident.first")}</dt><dd>{when(incident.first_seen_at)}</dd>
            <dt className="text-muted-foreground">{t("site.doctor.incident.last")}</dt><dd>{when(incident.last_seen_at)}</dd>
            <dt className="text-muted-foreground">{t("site.doctor.incident.rule")}</dt><dd className="font-mono text-xs leading-5">{incident.rule_version} · {incident.rule_code}</dd>
            <dt className="text-muted-foreground">{t("site.doctor.incident.assignee")}</dt>
            <dd>{incident.assignee_id === null ? t("site.doctor.incident.nobody") : who(incident.assignee_id)}</dd>
          </dl>
          {incident.status === "resolved" && incident.resolution_note && (
            <p className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm"><strong>{t("site.doctor.incident.resolution")}</strong> {incident.resolution_note}</p>
          )}
          {operator && (
            <IncidentControls id={incident.id} status={incident.status} severity={incident.severity}
              mine={incident.assignee_id === me.id} meId={me.id} />
          )}

          <div className="grid gap-5 @4xl:grid-cols-2">
            <section aria-labelledby="doctor-rules" className="grid content-start gap-2">
              <h2 id="doctor-rules" className="text-sm font-medium">{t("site.doctor.incident.rules", { count: incident.evidence.length })}</h2>
              <ul className="grid gap-2">
                {incident.evidence.map((item) => (
                  <li key={`${item.execution_id}-${item.rule_code}-${item.rule_version}`} className="grid gap-1 rounded-lg border border-border bg-card px-4 py-3">
                    <span className="text-sm"><Badge variant="outline" mono>{item.rule_code}</Badge> {item.description}</span>
                    <span className="text-xs text-muted-foreground">{t("site.doctor.incident.matchedEvents", { count: item.matched_event_ids.length, version: item.rule_version })}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="doctor-executions" className="grid content-start gap-2">
              <h2 id="doctor-executions" className="text-sm font-medium">{t("site.doctor.incident.executions")}</h2>
              <ul className="grid gap-2">
                {incident.executions.map((execution) => (
                  <li key={execution.id} className="grid gap-1 rounded-lg border border-border bg-card px-4 py-3">
                    <span className="truncate font-mono text-xs">{executionTitle(execution.id, execution.correlation_keys) ?? t("site.doctor.incident.execution", { id: execution.id.slice(0, 8) })}</span>
                    <span className="text-xs text-muted-foreground">
                      {label(executionStatusKey(execution.status), execution.status)} · {duration(execution.duration_ms)} · {when(execution.first_event_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {incident.history.length > 0 && (
              <section aria-labelledby="doctor-history" className="grid content-start gap-2">
                <h2 id="doctor-history" className="text-sm font-medium">{t("site.doctor.incident.history")}</h2>
                <ol className="grid gap-1.5 text-sm">
                  {incident.history.map((entry, index) => {
                    const of = entry.action === "severity" ? severityKey : statusKey;
                    const change = entry.action === "assignee"
                      ? t("site.doctor.incident.assigneeChanged")
                      : `${label(of(entry.from_value ?? ""), entry.from_value ?? "")} → ${label(of(entry.to_value ?? ""), entry.to_value ?? "")}`;
                    return (
                      <li key={index} className="grid gap-0.5 border-b border-border/60 pb-1.5">
                        <span>{change}</span>
                        <span className="text-xs text-muted-foreground">{who(entry.actor_id)} · {when(entry.created_at)}{entry.note ? ` · ${entry.note}` : ""}</span>
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}

            <section aria-labelledby="doctor-comments" className="grid content-start gap-2">
              <h2 id="doctor-comments" className="text-sm font-medium">{t("site.doctor.incident.comments")}</h2>
              {comments === null && <p className="text-sm text-muted-foreground">{t("site.doctor.incident.commentsFailed")}</p>}
              {comments?.length === 0 && <p className="text-sm text-muted-foreground">{t("site.doctor.incident.noComments")}</p>}
              {comments && comments.length > 0 && (
                <ul className="grid gap-2">
                  {comments.map((comment) => (
                    <li key={comment.id} className="grid gap-1 rounded-lg border border-border bg-card px-4 py-3">
                      <p className="text-sm break-words whitespace-pre-wrap">{comment.body_md}</p>
                      <span className="text-xs text-muted-foreground">
                        {comment.external_author ? t("site.doctor.incident.fromJira", { name: comment.external_author }) : who(comment.author_id)} · {when(comment.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {operator && <CommentForm id={incident.id} />}
            </section>
          </div>
        </div>
      )}
    </DoctorShell>
  );
}
