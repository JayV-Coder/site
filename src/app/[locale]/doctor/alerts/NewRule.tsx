"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { CheckList, FormField, OptionSelect } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EMPTY_RULE, RULE_TYPES, SEVERITIES, type RuleDraft } from "@/modules/doctor/alerts";
import { ENVIRONMENTS } from "@/modules/doctor/labels";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT, type Key } from "@/modules/i18n";
import { createRule } from "./actions";

export function NewRule({ channels }: { channels: { id: string; name: string }[] }) {
  const t = useT();
  const say = useSay();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RuleDraft>(EMPTY_RULE);
  const action = useKeyedAction();
  const set = <K extends keyof RuleDraft>(field: K, value: RuleDraft[K]) => { setDraft((current) => ({ ...current, [field]: value })); if (action.error) action.reset(); };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (action.busy) return; setOpen(next); if (!next) { setDraft(EMPTY_RULE); action.reset(); } }}>
      <DialogTrigger asChild><Button size="sm"><PlusIcon />{t("site.doctor.alerts.new")}</Button></DialogTrigger>
      <DialogContent closeLabel={t("common.close")}>
        <DialogHeader><DialogTitle>{t("site.doctor.alerts.new")}</DialogTitle></DialogHeader>
        <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); action.run((key) => createRule(draft, key), () => { setOpen(false); setDraft(EMPTY_RULE); }); }}>
          <FormField label={t("site.doctor.alerts.name")} htmlFor="doctor-rule-name">
            <Input id="doctor-rule-name" required minLength={2} maxLength={80} value={draft.name} onChange={(event) => set("name", event.currentTarget.value)} />
          </FormField>
          <FormField label={t("site.doctor.alerts.when")} htmlFor="doctor-rule-type">
            <OptionSelect id="doctor-rule-type" value={draft.type} onChange={(value) => set("type", value)}
              options={RULE_TYPES.map((value) => ({ value, label: t(`site.doctor.alerts.type.${value}` as Key) }))} />
          </FormField>
          {draft.type === "incident" && (
            <>
              <FormField label={t("site.doctor.alerts.minSeverity")} htmlFor="doctor-rule-severity">
                <OptionSelect id="doctor-rule-severity" value={draft.severity} onChange={(value) => set("severity", value)}
                  options={SEVERITIES.map((value) => ({ value, label: t(`site.doctor.alerts.severity.${value}` as Key) }))} />
              </FormField>
              <FormField label={t("site.doctor.alerts.environments")} hint={t("site.doctor.alerts.environmentsHint")}>
                <CheckList id="doctor-rule-env" selected={draft.environments} onChange={(value) => set("environments", value)}
                  items={ENVIRONMENTS.map((value) => ({ value, label: t(`site.doctor.env.${value}` as Key) }))} />
              </FormField>
            </>
          )}
          {draft.type === "error_rate" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label={t("site.doctor.alerts.threshold")} htmlFor="doctor-rule-threshold">
                <Input id="doctor-rule-threshold" type="number" min={1} max={100} value={draft.threshold} onChange={(event) => set("threshold", event.currentTarget.value)} />
              </FormField>
              <FormField label={t("site.doctor.alerts.window")} htmlFor="doctor-rule-window">
                <Input id="doctor-rule-window" type="number" min={5} max={1440} value={draft.minutes} onChange={(event) => set("minutes", event.currentTarget.value)} />
              </FormField>
            </div>
          )}
          {draft.type === "diagnosis_review" && (
            <FormField label={t("site.doctor.alerts.noReviewFor")} htmlFor="doctor-rule-review">
              <Input id="doctor-rule-review" type="number" min={5} max={1440} value={draft.minutes} onChange={(event) => set("minutes", event.currentTarget.value)} />
            </FormField>
          )}
          <FormField label={t("site.doctor.alerts.send")} hint={channels.length === 0 ? t("site.doctor.alerts.needChannel") : undefined}>
            <CheckList id="doctor-rule-channel" selected={draft.channels} onChange={(value) => set("channels", value)} items={channels.map((channel) => ({ value: channel.id, label: channel.name }))} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={t("site.doctor.alerts.quietFrom")} htmlFor="doctor-rule-from" hint={t("site.doctor.alerts.ruleQuietHint")}>
              <Input id="doctor-rule-from" type="time" value={draft.quietStart} onChange={(event) => set("quietStart", event.currentTarget.value)} />
            </FormField>
            <FormField label={t("site.doctor.alerts.quietUntil")} htmlFor="doctor-rule-until">
              <Input id="doctor-rule-until" type="time" value={draft.quietEnd} onChange={(event) => set("quietEnd", event.currentTarget.value)} />
            </FormField>
          </div>
          {action.error && <p role="alert" className="text-sm text-destructive">{say(action.error)}</p>}
          <DialogFooter><Button type="submit" loading={action.busy}>{t("site.doctor.alerts.saveRule")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
