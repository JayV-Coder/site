"use client";

import { useState, useTransition } from "react";
import { FormField, OptionSelect } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NEXT_STATUSES, SEVERITIES, severityKey, statusKey, type IncidentStatus } from "@/modules/doctor/labels";
import { useSay, useT } from "@/modules/i18n";
import type { Text } from "@/modules/i18n/types";
import { changeIncident } from "../actions";

type Severity = (typeof SEVERITIES)[number];

/** Status (só as transições que o banco aceita; resolver pede a nota), Severidade e assumir. */
export function IncidentControls({ id, status, severity, mine, meId }: {
  id: string; status: IncidentStatus; severity: Severity; mine: boolean; meId: string;
}) {
  const t = useT();
  const say = useSay();
  // "keep": o status atual (a lista de opções não aceita valor vazio).
  const [next, setNext] = useState<IncidentStatus | "keep">("keep");
  const [note, setNote] = useState("");
  const [error, setError] = useState<Text | null>(null);
  const [busy, startBusy] = useTransition();
  const label = (key: ReturnType<typeof statusKey>, fallback: string) => (key ? t(key) : fallback);

  const apply = (change: Parameters<typeof changeIncident>[1]) => {
    startBusy(async () => {
      const failed = await changeIncident(id, change).catch((): Text => ({ key: "site.doctor.error.offline" }));
      setError(failed);
      if (failed === null) { setNext("keep"); setNote(""); }
    });
  };

  return (
    <section aria-label={t("site.doctor.incident.actions")} className="grid gap-4 rounded-lg border border-border bg-card px-4 py-4">
      <form className="grid gap-3" onSubmit={(event) => {
        event.preventDefault();
        if (next === "keep") return;
        apply(next === "resolved" ? { status: next, resolution_note: note } : { status: next });
      }}>
        <FormField label={t("site.doctor.incident.changeStatus")} htmlFor="doctor-incident-status">
          <OptionSelect id="doctor-incident-status" value={next} onChange={setNext}
            options={[
              { value: "keep", label: t("site.doctor.incident.currentStatus", { status: label(statusKey(status), status) }) },
              ...NEXT_STATUSES[status].map((option) => ({ value: option, label: label(statusKey(option), option) })),
            ]} />
        </FormField>
        {next === "resolved" && (
          <FormField label={t("site.doctor.incident.resolutionNote")} htmlFor="doctor-incident-note">
            <Textarea id="doctor-incident-note" rows={3} required maxLength={4000} value={note} onChange={(event) => setNote(event.currentTarget.value)} />
          </FormField>
        )}
        <Button type="submit" className="justify-self-start" loading={busy} disabled={next === "keep" || (next === "resolved" && note.trim() === "")}>
          {t("site.doctor.incident.saveStatus")}
        </Button>
      </form>
      <div className="flex flex-wrap items-end gap-3">
        <FormField label={t("site.doctor.dashboard.severity")} htmlFor="doctor-incident-severity" className="min-w-40">
          <OptionSelect id="doctor-incident-severity" value={severity} disabled={busy} onChange={(value) => apply({ severity: value })}
            options={SEVERITIES.map((option) => ({ value: option, label: label(severityKey(option), option) }))} />
        </FormField>
        <Button variant="outline" disabled={busy} onClick={() => apply({ assignee_id: mine ? null : meId })}>
          {mine ? t("site.doctor.incident.release") : t("site.doctor.incident.take")}
        </Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{say(error)}</p>}
    </section>
  );
}
