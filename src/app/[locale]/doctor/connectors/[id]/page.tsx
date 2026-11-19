import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/molecules";
import { AutoRefresh } from "@/components/organisms/doctor/AutoRefresh";
import { Badge } from "@/components/ui/badge";
import { doctorGet, doctorList, type Schemas } from "@/modules/doctor/api";
import { syncSeconds, syncStatus } from "@/modules/doctor/connectors";
import { canManage, durationText, utcDateTime } from "@/modules/doctor/labels";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../../access";
import { DoctorShell } from "../../DoctorShell";
import { Unavailable, UnavailablePage } from "../../Unavailable";
import { ConnectorSummary } from "../ConnectorCard";
import { ConnectorAction, CredentialDialog, EditConnector, TestConnection } from "../ConnectorControls";
import { listIntegrations } from "@/modules/doctor/lists";

type Connector = Schemas["Connector"];
type ConnectorSync = Schemas["ConnectorSync"];
type Integration = Schemas["Integration"];

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/connectors/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.connector.title")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** O Conector e o histórico de Sincronizações, com o último erro e a ação que resolve. */
export default async function ConnectorPage({ params }: PageProps<"/[locale]/doctor/connectors/[id]">) {
  const { locale, id } = await params;
  const access = await requireDoctor(locale, `/doctor/connectors/${id}`);
  const t = await getT(locale);
  if (!access) return <UnavailablePage locale={locale} />;
  const [connector, syncs, integrations] = await Promise.all([
    doctorGet<Connector>(`/connectors/${encodeURIComponent(id)}`),
    doctorList<ConnectorSync[]>(`/connectors/${encodeURIComponent(id)}/syncs`),
    listIntegrations(),
  ]);
  if (connector === "not_found") notFound();
  const back = <BackLink href={`/${locale}/doctor/connectors`}>{t("site.doctor.nav.connectors")}</BackLink>;
  if (connector === null) {
    return (
      <DoctorShell locale={locale} active={access.active} current="connectors">
        {back}
        <Unavailable locale={locale} title={t("site.doctor.connector.unavailable")} retry={`/doctor/connectors/${id}`} />
      </DoctorShell>
    );
  }
  const manager = canManage(access.me);
  const paused = connector.status === "paused";
  const active = connector.status !== "disabled";
  // A lista traz só as Integrações ativas: fora dela, foi arquivada. Sem a lista, não se sabe.
  const integration = integrations === null ? t("site.doctor.connector.integrationUnknown")
    : integrations.find((item) => item.id === connector.integration_id)?.name ?? t("site.doctor.connector.integrationArchived");

  return (
    <DoctorShell locale={locale} active={access.active} current="connectors">
      <AutoRefresh />
      {back}
      <div className="grid gap-5">
        <ConnectorSummary locale={locale} connector={connector} now={new Date()} headingId="doctor-connector" integration={integration}
          actions={manager && active && (
            <div className="flex flex-wrap items-start gap-2">
              <ConnectorAction key={paused ? "resume" : "sync"} id={connector.id} action={paused ? "resume" : "sync"} primary />
              <TestConnection id={connector.id} name={connector.name} provider={connector.provider} auth={connector.config.auth} />
              <CredentialDialog id={connector.id} provider={connector.provider} auth={connector.config.auth} />
              <EditConnector id={connector.id} name={connector.name} interval={connector.sync_interval_seconds} />
              {!paused && <ConnectorAction id={connector.id} action="pause" />}
            </div>
          )}>
          {connector.last_error && connector.status === "paused" && (
            <p className="text-xs break-words text-muted-foreground">{t("site.doctor.connector.lastError", { error: connector.last_error })}</p>
          )}
        </ConnectorSummary>

        <section aria-labelledby="doctor-syncs" className="grid gap-2">
          <h2 id="doctor-syncs" className="text-sm font-medium">{t("site.doctor.connector.syncs")}</h2>
          {syncs === null && <p className="text-sm text-muted-foreground">{t("site.doctor.connector.syncsUnavailable")}</p>}
          {syncs?.length === 0 && <p className="text-sm text-muted-foreground">{t("site.doctor.connector.noSyncs")}</p>}
          {syncs && syncs.length > 0 && (
            <ul className="grid gap-2">
              {syncs.map((sync) => {
                const status = syncStatus(sync.status);
                const seconds = syncSeconds(sync.started_at, sync.finished_at);
                return (
                  <li key={sync.id} className="grid gap-1 rounded-lg border border-border bg-card px-4 py-3">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm">{utcDateTime(locale, sync.started_at)}</span>
                      <Badge variant={status.variant}>{"key" in status ? t(status.key) : status.text}</Badge>
                    </span>
                    <span className="text-xs break-words text-muted-foreground">
                      {[seconds === null ? t("site.doctor.sync.inProgress") : durationText(t, locale, seconds * 1000), t("site.doctor.executions.events", { count: sync.records }), sync.error].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </DoctorShell>
  );
}
