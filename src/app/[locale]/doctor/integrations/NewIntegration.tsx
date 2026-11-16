"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { FormField, OptionSelect } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { systemName } from "@/modules/doctor/diagnosis";
import { INTEGRATION_SYSTEMS } from "@/modules/doctor/integrations";
import { ENVIRONMENTS, nameOf } from "@/modules/doctor/labels";
import type { Key } from "@/modules/i18n";
import { useSay, useT } from "@/modules/i18n";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { createIntegration, type IntegrationDraft } from "./actions";

const EMPTY: IntegrationDraft = { name: "", source_system: "salesforce", target_system: "sap", environment: "prd", owner_team: "", description: "" };

export function NewIntegration() {
  const t = useT();
  const say = useSay();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY);
  const action = useKeyedAction();
  const set = (field: keyof IntegrationDraft) => (value: string) => { setDraft((current) => ({ ...current, [field]: value })); if (action.error) action.reset(); };
  const systems = INTEGRATION_SYSTEMS.map((value) => ({ value, label: nameOf(t, systemName(value)) }));

  return (
    <Dialog open={open} onOpenChange={(next) => { if (action.busy) return; setOpen(next); if (!next) { setDraft(EMPTY); action.reset(); } }}>
      <DialogTrigger asChild><Button size="sm"><PlusIcon />{t("site.doctor.integrations.new")}</Button></DialogTrigger>
      <DialogContent closeLabel={t("common.close")}>
        <DialogHeader><DialogTitle>{t("site.doctor.integrations.newTitle")}</DialogTitle></DialogHeader>
        <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); action.run((key) => createIntegration(draft, key), () => { setOpen(false); setDraft(EMPTY); }); }}>
          <FormField label={t("site.doctor.integrations.name")} htmlFor="doctor-integration-name" hint={t("site.doctor.integrations.nameHint")}>
            <Input id="doctor-integration-name" required minLength={2} maxLength={80} value={draft.name} onChange={(event) => set("name")(event.currentTarget.value)} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={t("site.doctor.integrations.source")} htmlFor="doctor-integration-source">
              <OptionSelect id="doctor-integration-source" value={draft.source_system} onChange={set("source_system")} options={systems} />
            </FormField>
            <FormField label={t("site.doctor.integrations.target")} htmlFor="doctor-integration-target">
              <OptionSelect id="doctor-integration-target" value={draft.target_system} onChange={set("target_system")} options={systems} />
            </FormField>
          </div>
          <FormField label={t("site.doctor.executions.environment")} htmlFor="doctor-integration-environment">
            <OptionSelect id="doctor-integration-environment" value={draft.environment} onChange={set("environment")}
              options={ENVIRONMENTS.map((value) => ({ value, label: t(`site.doctor.env.${value}` as Key) }))} />
          </FormField>
          <FormField label={t("site.doctor.integrations.teamOptional")} htmlFor="doctor-integration-team">
            <Input id="doctor-integration-team" maxLength={80} value={draft.owner_team} onChange={(event) => set("owner_team")(event.currentTarget.value)} />
          </FormField>
          <FormField label={t("site.doctor.integrations.descriptionOptional")} htmlFor="doctor-integration-description">
            <Textarea id="doctor-integration-description" maxLength={500} rows={3} value={draft.description} onChange={(event) => set("description")(event.currentTarget.value)} />
          </FormField>
          {action.error && <p role="alert" className="text-sm text-destructive">{say(action.error)}</p>}
          <DialogFooter><Button type="submit" loading={action.busy}>{t("site.doctor.integrations.save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
