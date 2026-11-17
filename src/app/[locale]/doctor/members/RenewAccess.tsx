"use client";

import { Button } from "@/components/ui/button";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT } from "@/modules/i18n";
import { renewAccess } from "./actions";

/** O token leva até 1 h para trazer um Papel novo; quem acabou de ser promovido não espera. */
export function RenewAccess() {
  const t = useT();
  const say = useSay();
  const action = useKeyedAction();
  return (
    <div className="grid justify-items-start gap-2">
      <Button variant="outline" loading={action.busy} onClick={() => action.run(() => renewAccess(), () => window.location.reload())}>{t("site.doctor.members.renew")}</Button>
      {action.error && <p role="alert" className="text-sm text-destructive">{say(action.error)}</p>}
    </div>
  );
}
