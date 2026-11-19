"use client";

import { ConfirmAction } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT } from "@/modules/i18n";
import { deleteIntegration } from "./actions";

/** Excluir de verdade: a página só mostra para a Integração `deletable` (sem histórico nem
 * configuração ligada). Se algo chegar entre a lista e o clique, a API recusa e a mensagem manda
 * arquivar. */
export function DeleteIntegration({ id, name }: { id: string; name: string }) {
  const t = useT();
  const say = useSay();
  const action = useKeyedAction();
  return (
    <>
      <ConfirmAction title={t("site.doctor.integrations.deleteTitle", { name })} description={t("site.doctor.integrations.deleteBody", { name })}
        confirm={t("site.doctor.integrations.delete")} onConfirm={() => action.run((key) => deleteIntegration(id, key))}>
        <Button variant="ghost" size="sm" className="text-destructive" loading={action.busy} aria-label={t("site.doctor.integrations.deleteTitle", { name })}>{t("site.doctor.integrations.delete")}</Button>
      </ConfirmAction>
      {action.error && <p role="alert" className="w-full text-sm text-destructive">{say(action.error)}</p>}
    </>
  );
}
