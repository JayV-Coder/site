"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormField, OptionSelect, ToggleRow } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatName } from "@/modules/doctor/reports";
import { useLocale, useSay, useT } from "@/modules/i18n";
import type { Text } from "@/modules/i18n/types";
import { createReport, reportStatus, shareReport } from "./actions";

type Format = "pdf" | "md";

const POLL_MS = 1000;
const POLL_TRIES = 30;

/** Opções da Tela 19. Gerar é assíncrono: o pedido vai para a fila e a tela espera o arquivo
 * ficar pronto (o worker leva poucos segundos) antes de baixar ou compartilhar. A chave fica a
 * mesma enquanto as opções forem as mesmas: clicar de novo retoma o mesmo relatório. */
export function ReportForm({ incidentId, downloadBase }: { incidentId: string; downloadBase: string }) {
  const t = useT();
  const say = useSay();
  const locale = useLocale();
  const router = useRouter();
  const [format, setFormat] = useState<Format>("pdf");
  const [timeline, setTimeline] = useState(true);
  const [excerpts, setExcerpts] = useState(false);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [error, setError] = useState<Text | null>(null);
  const [link, setLink] = useState<{ url: string; expires_at: string } | null>(null);
  // Qual botão espera o relatório: só ele mostra o carregamento.
  const [pending, setPending] = useState<"download" | "share" | null>(null);
  const [busy, startBusy] = useTransition();

  // Opção nova é outro pedido: chave nova, e o link anterior some da tela.
  const changed = () => { setKey(crypto.randomUUID()); setLink(null); setError(null); };

  async function ready(): Promise<string | null> {
    const created = await createReport(incidentId, { format, include_timeline: timeline, include_event_excerpts: excerpts }, key)
      .catch(() => ({ ok: false as const, error: { key: "site.doctor.error.offline" } }));
    if (!created.ok) { setError(created.error); return null; }
    for (let attempt = 0; attempt < POLL_TRIES; attempt += 1) {
      const status = await reportStatus(created.value.report_id).catch(() => null);
      if (status === "ready") return created.value.report_id;
      if (status === "failed") {
        // Falhou de vez: o próximo clique é outro pedido.
        setError({ key: "site.doctor.report.failed" });
        setKey(crypto.randomUUID());
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
    setError({ key: "site.doctor.report.stillGenerating" });
    return null;
  }

  const run = (which: "download" | "share", then: (report: string) => Promise<void>) => {
    setError(null);
    // Fora da transição: o aviso aparece já, não só quando ela termina.
    setPending(which);
    startBusy(async () => {
      const report = await ready();
      if (report) await then(report);
      setPending(null);
      router.refresh();
    });
  };

  const until = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }).format(new Date(iso)) + " UTC";

  return (
    <section aria-label={t("site.doctor.report.title")} className="grid gap-3 rounded-lg border border-border bg-card px-4 py-4">
      <FormField label={t("site.doctor.report.format")} htmlFor="doctor-report-format">
        <OptionSelect id="doctor-report-format" value={format} disabled={busy}
          onChange={(next) => { setFormat(next); changed(); }}
          options={(["pdf", "md"] as const).map((value) => ({ value, label: formatName(value) }))} />
      </FormField>
      <ToggleRow id="doctor-report-timeline" label={t("site.doctor.report.timeline")} checked={timeline} disabled={busy}
        onChange={(next) => { setTimeline(next); changed(); }} />
      <ToggleRow id="doctor-report-excerpts" label={t("site.doctor.report.excerpts")} checked={excerpts} disabled={busy}
        onChange={(next) => { setExcerpts(next); changed(); }} />
      {pending && <p role="status" className="text-sm text-muted-foreground">{t("site.doctor.report.generating")}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{say(error)}</p>}
      {link && (
        <div role="status" className="grid gap-2 rounded-md border border-border bg-secondary px-3 py-3">
          <p className="text-sm">{t("site.doctor.report.linkCreated", { when: until(link.expires_at) })}</p>
          <FormField label={t("site.doctor.report.link")} htmlFor="doctor-report-link">
            <Input id="doctor-report-link" readOnly value={link.url} className="font-mono text-xs" onFocus={(event) => event.currentTarget.select()} />
          </FormField>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button loading={pending === "download"} disabled={busy} onClick={() => run("download", async (report) => { window.location.assign(`${downloadBase}/${report}`); })}>
          {t("site.doctor.report.download", { format: formatName(format) })}
        </Button>
        <Button variant="outline" loading={pending === "share"} disabled={busy} onClick={() => run("share", async (report) => {
          const shared = await shareReport(report).catch(() => ({ ok: false as const, error: { key: "site.doctor.error.offline" } }));
          if (shared.ok) setLink(shared.value); else setError(shared.error);
        })}>
          {t("site.doctor.report.share")}
        </Button>
      </div>
    </section>
  );
}
