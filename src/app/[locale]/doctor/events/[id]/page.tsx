import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/molecules";
import { doctorGet, type Schemas } from "@/modules/doctor/api";
import { sanitizationItems } from "@/modules/doctor/executions";
import { isOperator } from "@/modules/doctor/labels";
import type { Key } from "@/modules/i18n";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../../access";
import { DoctorShell } from "../../DoctorShell";
import { Unavailable, UnavailablePage } from "../../Unavailable";
import { EventView } from "./EventView";

type EventDetail = Schemas["EventDetail"];

const SOURCES = ["import", "connector", "api"];

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/events/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.event.title")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Tela 9: o Evento normalizado inteiro, sem passar por texto de IA. O Log bruto (o arquivo ou
 * lote de onde ele veio) é de Analyst para cima e sai por link de 5 min. */
export default async function EventPage({ params, searchParams }: PageProps<"/[locale]/doctor/events/[id]">) {
  const [{ locale, id }, query] = await Promise.all([params, searchParams]);
  const access = await requireDoctor(locale, `/doctor/events/${id}`);
  const t = await getT(locale);
  if (!access) return <UnavailablePage locale={locale} />;
  // O instante (vindo da Timeline) leva a consulta direto à partição do Evento.
  const at = typeof query.at === "string" && !Number.isNaN(Date.parse(query.at)) ? query.at : null;
  const event = await doctorGet<EventDetail>(`/events/${encodeURIComponent(id)}${at ? `?at=${encodeURIComponent(at)}` : ""}`);
  if (event === "not_found") notFound();
  if (event === null) {
    return (
      <DoctorShell locale={locale} active={access.active} current="executions">
        <BackLink href={`/${locale}/doctor/executions`}>{t("site.doctor.nav.executions")}</BackLink>
        <Unavailable locale={locale} title={t("site.doctor.event.unavailable")} retry={`/doctor/events/${id}`} />
      </DoctorShell>
    );
  }

  const { raw_log: raw, ...normalized } = event;
  const operator = isOperator(access.me.active_role);
  const sanitization = sanitizationItems(event.sanitization_report);
  const lines = [
    ...sanitization.items.map((item) => t(item.key, { count: item.count, ...(item.kind && { kind: item.kind }) })),
    ...(sanitization.references > 0 ? [t("site.doctor.event.references", { count: sanitization.references })] : []),
  ];
  if (lines.length === 0) lines.push(t("site.doctor.event.nothingFound"));
  if (sanitization.truncated) lines.push(t("site.doctor.event.truncated"));

  return (
    <DoctorShell locale={locale} active={access.active} current="executions">
      {event.execution_ref
        ? <BackLink href={`/${locale}/doctor/executions/${event.execution_ref}`}>{t("site.doctor.event.back")}</BackLink>
        : <BackLink href={`/${locale}/doctor/executions`}>{t("site.doctor.nav.executions")}</BackLink>}
      <div className="grid gap-5">
        <EventView event={normalized} rawLogId={raw && operator ? raw.id : null} sanitization={lines} />
        <section aria-labelledby="doctor-event-origin" className="grid gap-2 rounded-lg border border-border bg-card px-4 py-4">
          <h2 id="doctor-event-origin" className="text-sm font-medium">{t("site.doctor.event.origin")}</h2>
          {raw ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">{t("site.doctor.event.source")}</dt>
              <dd>{SOURCES.includes(raw.source) ? t(`site.doctor.event.sourceKind.${raw.source}` as Key) : raw.source}</dd>
              {raw.import_filename && (<><dt className="text-muted-foreground">{t("site.doctor.event.file")}</dt><dd className="break-all">{raw.import_filename}</dd></>)}
              <dt className="text-muted-foreground">{t("site.doctor.event.retention")}</dt>
              <dd>{raw.retention_days_left === 0 ? t("site.doctor.event.retentionToday") : t("site.doctor.event.retentionDays", { count: raw.retention_days_left })}</dd>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">{t(operator ? "site.doctor.event.rawExpired" : "site.doctor.event.originRoles")}</p>
          )}
        </section>
      </div>
    </DoctorShell>
  );
}
