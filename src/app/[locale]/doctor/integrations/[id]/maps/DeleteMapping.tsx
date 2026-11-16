"use client";

import { ConfirmAction } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT } from "@/modules/i18n";
import { deleteMapping } from "../../actions";

/** Remover vale para os Eventos que chegarem depois; as Execuções já formadas ficam. */
export function DeleteMapping({ id, name }: { id: string; name: string }) {
  const t = useT();
  const say = useSay();
  const action = useKeyedAction();
  return (
    <div className="grid justify-items-start gap-1">
      <ConfirmAction title={t("site.doctor.maps.deleteTitle", { name })} description={t("site.doctor.maps.deleteBody", { name })}
        confirm={t("site.doctor.maps.delete")} onConfirm={() => action.run((key) => deleteMapping(id, key))}>
        <Button variant="ghost" size="sm" loading={action.busy} aria-label={t("site.doctor.maps.deleteTitle", { name })}>{t("site.doctor.maps.delete")}</Button>
      </ConfirmAction>
      {action.error && <p role="alert" className="text-sm text-destructive">{say(action.error)}</p>}
    </div>
  );
}
