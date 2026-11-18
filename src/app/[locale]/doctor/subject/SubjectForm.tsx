"use client";

import { useState, useTransition } from "react";
import { ConfirmAction, FormField } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OFFLINE, useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT } from "@/modules/i18n";
import type { Text } from "@/modules/i18n/types";
import { eraseSubject, findSubject } from "./actions";

/** A Referência (nº do pedido, CPF…) fica só na memória da página e vai no corpo da requisição. */
export function SubjectForm() {
  const t = useT();
  const say = useSay();
  const [reference, setReference] = useState("");
  const [found, setFound] = useState<number | null>(null);
  const [erased, setErased] = useState<number | null>(null);
  const [error, setError] = useState<Text | null>(null);
  const [searching, startSearch] = useTransition();
  const erase = useKeyedAction();

  const search = () => startSearch(async () => {
    const answer = await findSubject(reference).catch(() => ({ ok: false as const, error: OFFLINE }));
    setErased(null);
    if (answer.ok) { setError(null); setFound(answer.value.events); } else { setError(answer.error); setFound(null); }
  });

  return (
    <div className="grid max-w-xl gap-4">
      <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); search(); }}>
        <FormField label={t("site.doctor.subject.reference")} htmlFor="doctor-subject-reference">
          <Input id="doctor-subject-reference" value={reference} autoComplete="off" spellCheck={false}
            onChange={(event) => { setReference(event.currentTarget.value); setFound(null); setErased(null); erase.reset(); }} />
        </FormField>
        <div><Button type="submit" variant="outline" loading={searching} disabled={reference.trim() === ""}>{t("site.doctor.subject.find")}</Button></div>
      </form>
      {error && <p role="alert" className="text-sm text-destructive">{say(error)}</p>}
      {erase.error && <p role="alert" className="text-sm text-destructive">{say(erase.error)}</p>}
      {erased !== null && <p role="status" className="text-sm">{t("site.doctor.subject.erased", { count: erased })}</p>}
      {found !== null && (
        <section aria-label={t("site.doctor.subject.results")} className="grid gap-3 rounded-lg border border-border bg-card px-4 py-4">
          <p role="status" className="text-sm">{found === 0 ? t("site.doctor.subject.none") : t("site.doctor.subject.found", { count: found })}</p>
          {found > 0 && (
            <ConfirmAction title={t("site.doctor.subject.eraseTitle", { count: found })} description={t("site.doctor.subject.eraseBody")} confirm={t("site.doctor.subject.erase")}
              onConfirm={() => erase.run(async (key) => {
                const answer = await eraseSubject(reference, key);
                if (!answer.ok) return answer.error;
                setErased(answer.value.events_erased);
                setFound(0);
                return null;
              })}>
              <Button variant="destructive" className="justify-self-start" loading={erase.busy}>{t("site.doctor.subject.erase")}</Button>
            </ConfirmAction>
          )}
        </section>
      )}
    </div>
  );
}
