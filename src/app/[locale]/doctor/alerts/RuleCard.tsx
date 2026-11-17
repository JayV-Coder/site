"use client";

import { useEffect, useState } from "react";
import { ConfirmAction } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT } from "@/modules/i18n";
import { deleteRule, toggleRule } from "./actions";

/** A regra com o interruptor (otimista: muda na hora e volta se a API recusar). Só Owner e
 * Admin com MFA mudam; os outros Papéis só leem. */
export function RuleCard({ id, name, enabled, when, send, manager }: { id: string; name: string; enabled: boolean; when: string; send: string; manager: boolean }) {
  const t = useT();
  const say = useSay();
  const [on, setOn] = useState(enabled);
  const toggle = useKeyedAction();
  const remove = useKeyedAction();
  // A API recusou: o interruptor volta ao que o servidor tem.
  useEffect(() => { if (toggle.error) setOn(enabled); }, [toggle.error, enabled]);
  const error = toggle.error ?? remove.error;

  return (
    <article aria-labelledby={`doctor-rule-${id}`} className="grid content-start gap-3 rounded-lg border border-border bg-card px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <h2 id={`doctor-rule-${id}`} className={on ? "min-w-0 font-medium break-words" : "min-w-0 font-medium break-words text-muted-foreground"}>{name}</h2>
        <Switch aria-label={name} checked={on} disabled={!manager || toggle.busy}
          onCheckedChange={(next) => { setOn(next); toggle.run((key) => toggleRule(id, next, key)); }} />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">{t("site.doctor.alerts.when")}</dt>
        <dd className="break-words">{when}</dd>
        <dt className="text-muted-foreground">{t("site.doctor.alerts.send")}</dt>
        <dd className="break-words">{send}</dd>
      </dl>
      {error && <p role="alert" className="text-sm text-destructive">{say(error)}</p>}
      {manager && (
        <div>
          <ConfirmAction title={t("site.doctor.alerts.removeTitle", { name })} description={t("site.doctor.alerts.removeBody")} confirm={t("site.doctor.alerts.remove")}
            onConfirm={() => remove.run((key) => deleteRule(id, key))}>
            <Button variant="ghost" size="sm" loading={remove.busy}>{t("site.doctor.alerts.remove")}</Button>
          </ConfirmAction>
        </div>
      )}
    </article>
  );
}
