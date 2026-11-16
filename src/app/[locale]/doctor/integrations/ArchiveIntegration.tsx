"use client";

import { ConfirmAction } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT } from "@/modules/i18n";
import { archiveIntegration } from "./actions";

/** Arquivar não se desfaz: a Integração sai das listas e não muda mais; o histórico fica. A chave
 * de idempotência faz a repetição depois de uma resposta perdida dar certo, não "já arquivada". */
export function ArchiveIntegration({ id, name }: { id: string; name: string }) {
  const t = useT();
  const say = useSay();
  const action = useKeyedAction();
  return (
    <>
      <ConfirmAction title={t("site.doctor.integrations.archiveTitle", { name })} description={t("site.doctor.integrations.archiveBody", { name })}
        confirm={t("site.doctor.integrations.archive")} onConfirm={() => action.run((key) => archiveIntegration(id, key))}>
        <Button variant="ghost" size="sm" loading={action.busy} aria-label={t("site.doctor.integrations.archiveTitle", { name })}>{t("site.doctor.integrations.archive")}</Button>
      </ConfirmAction>
      {action.error && <p role="alert" className="w-full text-sm text-destructive">{say(action.error)}</p>}
    </>
  );
}
