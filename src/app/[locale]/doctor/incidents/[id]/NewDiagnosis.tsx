"use client";

import { useState } from "react";
import { ToggleRow } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSay, useT } from "@/modules/i18n";
import { requestDiagnosis } from "../actions";
import { useKeyedAction } from "./useKeyedAction";

const MODES = ["hybrid", "rules_only"] as const;
type Mode = (typeof MODES)[number];

/** "Novo diagnóstico" cria a versão N+1; o pedido é assíncrono e o progresso aparece no card. A
 * chave muda junto com o modo ou a Base: aí já é outro pedido. */
export function NewDiagnosis({ incidentId }: { incidentId: string }) {
  const t = useT();
  const say = useSay();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("hybrid");
  const [knowledge, setKnowledge] = useState(true);
  const action = useKeyedAction();

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!action.busy) { setOpen(next); if (!next) action.reset(); } }}>
      <DialogTrigger asChild><Button>{t("site.doctor.diagnosis.new")}</Button></DialogTrigger>
      <DialogContent closeLabel={t("common.close")}>
        <DialogHeader>
          <DialogTitle>{t("site.doctor.diagnosis.new")}</DialogTitle>
          <DialogDescription>{t("site.doctor.diagnosis.newHint")}</DialogDescription>
        </DialogHeader>
        <fieldset className="grid gap-2">
          <legend className="mb-1.5 text-xs text-muted-foreground">{t("site.doctor.diagnosis.modeLabel")}</legend>
          {MODES.map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 px-3.5 py-3 text-sm has-checked:border-foreground/40 has-checked:bg-secondary">
              <input type="radio" name="doctor-diagnosis-mode" value={option} checked={mode === option} className="size-4 accent-foreground"
                onChange={() => { setMode(option); action.reset(); }} />
              {t(option === "hybrid" ? "site.doctor.diagnosis.mode.hybridOption" : "site.doctor.diagnosis.mode.rulesOption")}
            </label>
          ))}
        </fieldset>
        <ToggleRow id="doctor-diagnosis-knowledge" label={t("site.doctor.diagnosis.useKnowledge")} disabled={mode === "rules_only"}
          checked={mode === "hybrid" && knowledge} onChange={(next) => { setKnowledge(next); action.reset(); }} />
        {action.error && <p role="alert" className="text-sm text-destructive">{say(action.error)}</p>}
        <DialogFooter>
          <Button loading={action.busy} onClick={() => action.run(
            (key) => requestDiagnosis(incidentId, { mode, include_knowledge_base: mode === "hybrid" && knowledge }, key),
            () => setOpen(false),
          )}>{t("site.doctor.diagnosis.run")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
