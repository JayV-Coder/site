"use client";

import { useMemo, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { FormField, ToggleRow } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Schemas } from "@/modules/doctor/api";
import { MAX_PATTERN_LENGTH, MAX_PATTERNS, previewSanitized, readRows, rowsPayload, type Row } from "@/modules/doctor/sanitization";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT } from "@/modules/i18n";
import { saveSanitization } from "./actions";

type Rules = Schemas["SanitizationRules"];

export function SanitizationEditor({ rules, editable }: { rules: Rules; editable: boolean }) {
  const t = useT();
  const say = useSay();
  const save = useKeyedAction();
  const [rows, setRows] = useState<Row[]>(() => readRows(rules.extra_patterns));
  const [detectIps, setDetectIps] = useState(rules.detect_ips);
  const [allowPrivate, setAllowPrivate] = useState(rules.allow_private_ips);
  const [sample, setSample] = useState("");
  const [saved, setSaved] = useState(false);
  const checked = useMemo(() => rowsPayload(rows), [rows]);
  const preview = useMemo(() => (sample ? previewSanitized(sample, rows) : ""), [sample, rows]);
  const filled = rows.filter((row) => row.kind.trim() || row.pattern.trim()).length;

  const change = (index: number, patch: Partial<Row>) => {
    setSaved(false);
    save.reset();
    setRows((current) => current.map((row, at) => (at === index ? { ...row, ...patch } : row)));
  };

  const submit = () => {
    if (!checked.ok) return;
    const body: Rules = { extra_patterns: checked.patterns, detect_ips: detectIps, allow_private_ips: detectIps && allowPrivate };
    save.run((key) => saveSanitization(body, key), () => setSaved(true), JSON.stringify(body));
  };

  return (
    <form className="grid gap-5" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <section aria-labelledby="doctor-sanitization-ips" className="grid gap-2">
        <h2 id="doctor-sanitization-ips" className="text-sm font-medium text-muted-foreground">{t("site.doctor.sanitization.ips")}</h2>
        <ToggleRow id="doctor-sanitization-detect-ips" label={t("site.doctor.sanitization.detectIps")} hint={t("site.doctor.sanitization.detectIpsHint")}
          checked={detectIps} disabled={!editable} onChange={(value) => { setSaved(false); setDetectIps(value); }} />
        <ToggleRow id="doctor-sanitization-private-ips" label={t("site.doctor.sanitization.allowPrivate")} hint={t("site.doctor.sanitization.allowPrivateHint")}
          checked={detectIps && allowPrivate} disabled={!editable || !detectIps} onChange={(value) => { setSaved(false); setAllowPrivate(value); }} />
      </section>

      <section aria-labelledby="doctor-sanitization-patterns" className="grid gap-3">
        <div className="grid gap-1">
          <h2 id="doctor-sanitization-patterns" className="text-sm font-medium text-muted-foreground">{t("site.doctor.sanitization.patterns")}</h2>
          <p className="text-xs text-muted-foreground">{t("site.doctor.sanitization.patternsHint", { max: MAX_PATTERNS })}</p>
        </div>
        {rows.length === 0 && <p className="text-sm text-muted-foreground">{t("site.doctor.sanitization.none")}</p>}
        <ol className="grid gap-3">
          {rows.map((row, index) => {
            const problem = !checked.ok && checked.index === index ? checked.reason : null;
            return (
              <li key={index} className="grid gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] sm:items-start">
                <FormField label={t("site.doctor.sanitization.kind")} htmlFor={`doctor-sanitization-kind-${index}`} hint={index === 0 ? t("site.doctor.sanitization.kindHint") : undefined}
                  error={problem === "kind" || problem === "duplicate" || problem === "tooMany" ? t(`site.doctor.sanitization.error.${problem}`, { max: MAX_PATTERNS }) : null}>
                  <Input id={`doctor-sanitization-kind-${index}`} value={row.kind} disabled={!editable} autoCapitalize="none" spellCheck={false} maxLength={31}
                    className="font-mono" onChange={(event) => change(index, { kind: event.currentTarget.value })} />
                </FormField>
                <FormField label={t("site.doctor.sanitization.pattern")} htmlFor={`doctor-sanitization-pattern-${index}`}
                  error={problem && problem !== "kind" && problem !== "duplicate" && problem !== "tooMany" ? t(`site.doctor.sanitization.error.${problem}`, { max: MAX_PATTERN_LENGTH }) : null}>
                  <Input id={`doctor-sanitization-pattern-${index}`} value={row.pattern} disabled={!editable} autoCapitalize="none" spellCheck={false}
                    className="font-mono" onChange={(event) => change(index, { pattern: event.currentTarget.value })} />
                </FormField>
                {editable && (
                  <Button type="button" variant="ghost" size="icon" className="justify-self-end sm:mt-6" aria-label={t("site.doctor.sanitization.removeRow", { kind: row.kind || String(index + 1) })}
                    onClick={() => { setSaved(false); setRows((current) => current.filter((_, at) => at !== index)); }}>
                    <Trash2Icon />
                  </Button>
                )}
              </li>
            );
          })}
        </ol>
        {editable && filled < MAX_PATTERNS && (
          <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setRows((current) => [...current, { kind: "", pattern: "" }])}>
            <PlusIcon />{t("site.doctor.sanitization.add")}
          </Button>
        )}
      </section>

      <section aria-labelledby="doctor-sanitization-preview" className="grid gap-2">
        <h2 id="doctor-sanitization-preview" className="text-sm font-medium text-muted-foreground">{t("site.doctor.sanitization.preview")}</h2>
        <FormField label={t("site.doctor.sanitization.sample")} htmlFor="doctor-sanitization-sample" hint={t("site.doctor.sanitization.sampleHint")}>
          <Textarea id="doctor-sanitization-sample" rows={3} value={sample} spellCheck={false} onChange={(event) => setSample(event.currentTarget.value)} />
        </FormField>
        {preview && <pre aria-live="polite" className="overflow-x-auto rounded-md border border-border bg-secondary px-3 py-2 font-mono text-xs whitespace-pre-wrap break-all">{preview}</pre>}
      </section>

      {editable && (
        <div className="grid justify-items-start gap-2">
          {save.error && <p role="alert" className="text-sm text-destructive">{say(save.error)}</p>}
          {saved && <p role="status" className="text-sm text-success">{t("site.doctor.sanitization.saved")}</p>}
          <Button type="submit" loading={save.busy} disabled={!checked.ok}>{t("site.doctor.sanitization.save")}</Button>
        </div>
      )}
    </form>
  );
}
