import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { Schemas } from "@/modules/doctor/api";
import { checkpointInstant, connectorState, intervalParts, pauseKey, relativeParts } from "@/modules/doctor/connectors";
import { utcDateTime } from "@/modules/doctor/labels";
import { getT } from "@/modules/i18n/server";

type Connector = Schemas["Connector"];
type T = Awaited<ReturnType<typeof getT>>;

/** Há quanto tempo ou daqui a quanto, no idioma de quem lê. */
export function relative(t: T, instant: string, now: Date): string {
  const parts = relativeParts(instant, now);
  if (parts.unit === "now") return t("site.doctor.connector.now");
  const key = parts.count < 0 ? `site.doctor.connector.ago.${parts.unit}` : `site.doctor.connector.in.${parts.unit}`;
  return t(key as Parameters<T>[0], { count: Math.abs(parts.count) });
}

/** O cabeçalho e os fatos de um Conector, iguais na lista e no detalhe. */
export async function ConnectorSummary({ locale, connector, now, headingId, integration, actions, children }: {
  locale: string; connector: Connector; now: Date; headingId: string; integration?: string; actions?: ReactNode; children?: ReactNode;
}) {
  const t = await getT(locale);
  const state = connectorState(connector);
  const paused = connector.status === "paused";
  const failing = connector.status === "failing";
  const checkpoint = checkpointInstant(connector.checkpoint);
  const interval = intervalParts(connector.sync_interval_seconds);
  const records = connector.last_sync_records ?? 0;
  return (
    <article aria-labelledby={headingId} className="grid h-full content-start gap-3 rounded-lg border border-border bg-card px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 id={headingId} className="min-w-0 font-medium break-words"><span className="font-mono text-xs text-muted-foreground">{connector.provider}</span> · {connector.name}</h2>
        <Badge variant={state.variant}>{t(state.key)}</Badge>
      </div>
      {/* O erro vem do worker como está: é a mensagem do provedor. */}
      {failing && connector.last_error && (
        <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm break-words">
          {t("site.doctor.connector.failures", { count: connector.consecutive_failures })} {connector.last_error}
        </p>
      )}
      {(paused || connector.paused_reason === "api_limit") && (
        <p className="rounded-md border border-border bg-secondary px-3 py-2 text-sm">{t(pauseKey(connector.paused_reason))}</p>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {integration !== undefined && (<><dt className="text-muted-foreground">{t("site.doctor.connector.integration")}</dt><dd className="break-words">{integration}</dd></>)}
        <dt className="text-muted-foreground">{t("site.doctor.connector.lastSync")}</dt>
        <dd>{connector.last_sync_at ? `${relative(t, connector.last_sync_at, now)} · ${t("site.doctor.executions.events", { count: records })}` : t("site.doctor.connector.neverSynced")}</dd>
        <dt className="text-muted-foreground">{t("site.doctor.connector.checkpoint")}</dt>
        <dd className={checkpoint && checkpoint !== "saved" ? "font-mono text-xs leading-5" : undefined}>
          {checkpoint === null ? t("site.doctor.connector.noCheckpoint") : checkpoint === "saved" ? t("site.doctor.connector.checkpointSaved") : utcDateTime(locale, checkpoint)}
        </dd>
        {integration !== undefined && (<><dt className="text-muted-foreground">{t("site.doctor.connector.interval")}</dt><dd>{t(`site.doctor.connector.every.${interval.unit}`, { count: interval.count })}</dd></>)}
        {connector.status !== "disabled" && !paused && (
          <><dt className="text-muted-foreground">{t("site.doctor.connector.next")}</dt>
            <dd>{relative(t, connector.next_run_at, now)}{failing && ` ${t("site.doctor.connector.backoff")}`}</dd></>
        )}
      </dl>
      {actions}
      {children}
    </article>
  );
}
