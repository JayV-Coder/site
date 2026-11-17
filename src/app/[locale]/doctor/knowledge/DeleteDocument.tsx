"use client";

import { Trash2Icon } from "lucide-react";
import { ConfirmAction } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT } from "@/modules/i18n";
import { deleteDocument } from "./actions";

/** Remover tira o documento das próximas consultas do Diagnóstico. */
export function DeleteDocument({ id, title }: { id: string; title: string }) {
  const t = useT();
  const say = useSay();
  const action = useKeyedAction();
  return (
    <div className="grid justify-items-end gap-1">
      <ConfirmAction title={t("site.doctor.knowledge.deleteTitle", { title })} description={t("site.doctor.knowledge.deleteBody")}
        confirm={t("site.doctor.knowledge.remove")} onConfirm={() => action.run((key) => deleteDocument(id, key))}>
        <Button variant="ghost" size="icon" loading={action.busy} aria-label={t("site.doctor.knowledge.deleteTitle", { title })}><Trash2Icon /></Button>
      </ConfirmAction>
      {action.error && <p role="alert" className="text-xs text-destructive">{say(action.error)}</p>}
    </div>
  );
}
