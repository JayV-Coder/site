"use client";

import { useState, useTransition } from "react";
import { CopyIcon } from "lucide-react";
import { SegmentedControl } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import type { Schemas } from "@/modules/doctor/api";
import { highlightJson, type JsonToken } from "@/modules/doctor/executions";
import { useT } from "@/modules/i18n";
import { rawLogUrl } from "../../executions/actions";

type EventDetail = Omit<Schemas["EventDetail"], "raw_log">;

/** As cores do realce saem dos tokens do tema; o que a Sanitização trocou fica destacado. */
const TOKEN_CLASS: Record<JsonToken["kind"], string> = {
  plain: "",
  key: "text-foreground",
  string: "text-success",
  number: "text-warning",
  literal: "text-warning",
  redacted: "rounded-sm bg-destructive/10 text-destructive",
};

export function EventView({ event, rawLogId, sanitization }: { event: EventDetail; rawLogId: string | null; sanitization: string[] }) {
  const t = useT();
  const [tab, setTab] = useState<"normalized" | "raw">("normalized");
  const [copied, setCopied] = useState<"ok" | "failed" | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, startBusy] = useTransition();

  const copy = () => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2)).then(() => setCopied("ok"), () => setCopied("failed"));
    window.setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="min-w-0 truncate font-mono text-lg font-semibold">{event.operation}</h1>
        <Button variant="outline" size="sm" onClick={copy}>
          <CopyIcon />
          <span aria-live="polite">{copied === "ok" ? t("site.doctor.event.copied") : copied === "failed" ? t("site.doctor.event.copyFailed") : t("site.doctor.event.copy")}</span>
        </Button>
      </div>
      <SegmentedControl label={t("site.doctor.event.format")} value={tab} onChange={setTab}
        options={[{ value: "normalized", label: t("site.doctor.event.normalized") }, { value: "raw", label: t("site.doctor.event.raw") }]} />
      {tab === "normalized" ? (
        <section aria-label={t("site.doctor.event.normalizedLabel")} className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-2 font-mono text-xs text-muted-foreground">event.v1.json</div>
          <pre dir="ltr" className="overflow-x-auto px-4 py-3 font-mono text-xs leading-relaxed text-muted-foreground">
            {highlightJson(event).map((token, index) => token.kind === "plain" ? token.text : <span key={index} className={TOKEN_CLASS[token.kind]}>{token.text}</span>)}
          </pre>
        </section>
      ) : (
        <section aria-label={t("site.doctor.event.raw")} className="grid justify-items-start gap-3 rounded-lg border border-border bg-card px-4 py-4">
          <p className="text-sm leading-relaxed">{t("site.doctor.event.rawBody")}</p>
          {failed && <p role="alert" className="text-sm text-destructive">{t("site.doctor.event.rawFailed")}</p>}
          {rawLogId ? (
            <Button loading={busy} onClick={() => startBusy(async () => {
              const url = await rawLogUrl(rawLogId).catch(() => null);
              setFailed(url === null);
              if (url) window.location.assign(url);
            })}>
              {t("site.doctor.event.rawDownload")}
            </Button>
          ) : <p className="text-sm text-muted-foreground">{t("site.doctor.event.rawRoles")}</p>}
        </section>
      )}
      <section aria-labelledby="doctor-event-sanitization" className="grid gap-1.5 rounded-lg border border-border bg-card px-4 py-4">
        <h2 id="doctor-event-sanitization" className="text-sm font-medium">{t("site.doctor.event.sanitization")}</h2>
        <ul className="grid gap-1 text-sm">
          {sanitization.map((line) => <li key={line} className="flex gap-2"><span aria-hidden="true" className="text-success">✓</span>{line}</li>)}
        </ul>
      </section>
    </>
  );
}
