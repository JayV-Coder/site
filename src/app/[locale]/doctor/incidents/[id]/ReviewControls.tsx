"use client";

import { useState, type FormEvent } from "react";
import { FormField, OptionSelect } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SYSTEMS, systemName } from "@/modules/doctor/diagnosis";
import { useSay, useT } from "@/modules/i18n";
import { promoteIncident, reviewDiagnosis, type Review } from "../actions";
import { useKeyedAction } from "./useKeyedAction";

function filled(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Revisão humana (#26): Aceitar direto; Corrigir e Rejeitar pedem o porquê numa janela. Cada
 * ação tem a própria mensagem de erro e a própria chave de idempotência. */
export function ReviewControls({ diagnosisId }: { diagnosisId: string }) {
  const t = useT();
  const say = useSay();
  const accept = useKeyedAction();
  return (
    <section aria-label={t("site.doctor.review.title")} className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Button loading={accept.busy} onClick={() => accept.run((key) => reviewDiagnosis(diagnosisId, { verdict: "accepted" }, key))}>
          {t("site.doctor.review.accept")}
        </Button>
        <ReviewDialog diagnosisId={diagnosisId} verdict="corrected" />
        <ReviewDialog diagnosisId={diagnosisId} verdict="rejected" />
      </div>
      {accept.error && <p role="alert" className="text-sm text-destructive">{say(accept.error)}</p>}
    </section>
  );
}

function ReviewDialog({ diagnosisId, verdict }: { diagnosisId: string; verdict: "corrected" | "rejected" }) {
  const t = useT();
  const say = useSay();
  const [open, setOpen] = useState(false);
  const [system, setSystem] = useState("unknown");
  const action = useKeyedAction();
  const correcting = verdict === "corrected";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const review: Review = correcting
      ? {
        verdict, correct_category: filled(data, "category")?.toUpperCase(), correct_cause: filled(data, "cause"),
        responsible_system: system === "unknown" ? undefined : system, comment: filled(data, "comment"),
      }
      : { verdict, comment: filled(data, "comment") };
    action.run((key) => reviewDiagnosis(diagnosisId, review, key), () => setOpen(false));
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!action.busy) { setOpen(next); if (!next) { action.reset(); setSystem("unknown"); } } }}>
      <DialogTrigger asChild>
        <Button variant="outline">{t(correcting ? "site.doctor.review.correct" : "site.doctor.review.reject")}</Button>
      </DialogTrigger>
      <DialogContent closeLabel={t("common.close")}>
        <DialogHeader>
          <DialogTitle>{t(correcting ? "site.doctor.review.correctTitle" : "site.doctor.review.rejectTitle")}</DialogTitle>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={submit} onChange={() => { if (action.error) action.reset(); }}>
          {correcting ? (
            <>
              <FormField label={t("site.doctor.review.category")} htmlFor="doctor-review-category">
                <Input id="doctor-review-category" name="category" placeholder="SAP_LOCK" autoCapitalize="characters" maxLength={64} className="font-mono" />
              </FormField>
              <FormField label={t("site.doctor.review.cause")} htmlFor="doctor-review-cause">
                <Textarea id="doctor-review-cause" name="cause" rows={3} maxLength={2000} />
              </FormField>
              <FormField label={t("site.doctor.review.system")} htmlFor="doctor-review-system">
                <OptionSelect id="doctor-review-system" value={system} onChange={setSystem}
                  options={[
                    { value: "unknown", label: t("site.doctor.diagnosis.system.unknown") },
                    ...SYSTEMS.map((value) => {
                      const found = systemName(value);
                      return { value, label: "name" in found ? found.name : t(found.key) };
                    }),
                  ]} />
              </FormField>
              <FormField label={t("site.doctor.review.comment")} htmlFor="doctor-review-comment">
                <Textarea id="doctor-review-comment" name="comment" rows={2} maxLength={2000} />
              </FormField>
            </>
          ) : (
            <FormField label={t("site.doctor.review.why")} htmlFor="doctor-review-why">
              <Textarea id="doctor-review-why" name="comment" rows={3} maxLength={2000} />
            </FormField>
          )}
          {action.error && <p role="alert" className="text-sm text-destructive">{say(action.error)}</p>}
          <DialogFooter>
            <Button type="submit" variant={correcting ? "default" : "destructive"} loading={action.busy}>
              {t(correcting ? "site.doctor.review.save" : "site.doctor.review.reject")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Incidente resolvido com Diagnóstico aceito ou corrigido: o caso vai para a Base de conhecimento. */
export function PromoteButton({ incidentId }: { incidentId: string }) {
  const t = useT();
  const say = useSay();
  const action = useKeyedAction();
  return (
    <div className="grid justify-items-start gap-2">
      <Button variant="outline" loading={action.busy} onClick={() => action.run((key) => promoteIncident(incidentId, key))}>
        {t("site.doctor.promote.action")}
      </Button>
      {action.error && <p role="alert" className="text-sm text-destructive">{say(action.error)}</p>}
    </div>
  );
}
