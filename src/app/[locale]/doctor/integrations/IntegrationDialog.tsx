"use client";

import { useState, type ReactNode } from "react";
import { FormField, OptionSelect } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { systemName } from "@/modules/doctor/diagnosis";
import { INTEGRATION_SYSTEMS, type IntegrationDraft } from "@/modules/doctor/integrations";
import { ENVIRONMENTS, nameOf } from "@/modules/doctor/labels";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import type { Key } from "@/modules/i18n";
import { useSay, useT } from "@/modules/i18n";
import type { Text } from "@/modules/i18n/types";

/** O formulário de Integração num diálogo, para criar e para editar. `id` separa os campos de
 * diálogos abertos na mesma página. Abrir de novo descarta o que não foi salvo. */
export function IntegrationDialog({ id, trigger, title, initial, submit }: {
  id: string;
  trigger: ReactNode;
  title: string;
  initial: IntegrationDraft;
  submit: (draft: IntegrationDraft, key: string) => Promise<Text | null>;
}) {
  const t = useT();
  const say = useSay();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(initial);
  const action = useKeyedAction();
  const set = (field: keyof IntegrationDraft) => (value: string) => { setDraft((current) => ({ ...current, [field]: value })); if (action.error) action.reset(); };
  const systems = INTEGRATION_SYSTEMS.map((value) => ({ value, label: nameOf(t, systemName(value)) }));
  const field = (name: string) => `${id}-${name}`;

  return (
    // Preenche ao abrir: depois de salvar, `initial` já traz os valores novos da página.
    <Dialog open={open} onOpenChange={(next) => { if (action.busy) return; setOpen(next); action.reset(); if (next) setDraft(initial); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent closeLabel={t("common.close")}>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); action.run((key) => submit(draft, key), () => setOpen(false), JSON.stringify(draft)); }}>
          <FormField label={t("site.doctor.integrations.name")} htmlFor={field("name")} hint={t("site.doctor.integrations.nameHint")}>
            <Input id={field("name")} required minLength={2} maxLength={80} value={draft.name} onChange={(event) => set("name")(event.currentTarget.value)} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={t("site.doctor.integrations.source")} htmlFor={field("source")}>
              <OptionSelect id={field("source")} value={draft.source_system} onChange={set("source_system")} options={systems} />
            </FormField>
            <FormField label={t("site.doctor.integrations.target")} htmlFor={field("target")}>
              <OptionSelect id={field("target")} value={draft.target_system} onChange={set("target_system")} options={systems} />
            </FormField>
          </div>
          <FormField label={t("site.doctor.executions.environment")} htmlFor={field("environment")}>
            <OptionSelect id={field("environment")} value={draft.environment} onChange={set("environment")}
              options={ENVIRONMENTS.map((value) => ({ value, label: t(`site.doctor.env.${value}` as Key) }))} />
          </FormField>
          <FormField label={t("site.doctor.integrations.teamOptional")} htmlFor={field("team")}>
            <Input id={field("team")} maxLength={80} value={draft.owner_team} onChange={(event) => set("owner_team")(event.currentTarget.value)} />
          </FormField>
          <FormField label={t("site.doctor.integrations.descriptionOptional")} htmlFor={field("description")}>
            <Textarea id={field("description")} maxLength={500} rows={3} value={draft.description} onChange={(event) => set("description")(event.currentTarget.value)} />
          </FormField>
          {action.error && <p role="alert" className="text-sm text-destructive">{say(action.error)}</p>}
          <DialogFooter><Button type="submit" loading={action.busy}>{t("site.doctor.integrations.save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
