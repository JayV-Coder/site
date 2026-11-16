"use client";

import { useState, useTransition } from "react";
import { ConfirmAction } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { useSay, useT } from "@/modules/i18n";
import type { Text } from "@/modules/i18n/types";
import { archiveIntegration } from "./actions";

/** Arquivar não se desfaz: a Integração sai das listas e não muda mais; o histórico fica. */
export function ArchiveIntegration({ id, name }: { id: string; name: string }) {
  const t = useT();
  const say = useSay();
  const [error, setError] = useState<Text | null>(null);
  const [busy, startBusy] = useTransition();
  return (
    <>
      <ConfirmAction title={t("site.doctor.integrations.archiveTitle", { name })} description={t("site.doctor.integrations.archiveBody", { name })}
        confirm={t("site.doctor.integrations.archive")}
        onConfirm={() => startBusy(async () => setError(await archiveIntegration(id).catch((): Text => ({ key: "site.doctor.error.offline" }))))}>
        <Button variant="ghost" size="sm" loading={busy} aria-label={t("site.doctor.integrations.archiveTitle", { name })}>{t("site.doctor.integrations.archive")}</Button>
      </ConfirmAction>
      {error && <p role="alert" className="w-full text-sm text-destructive">{say(error)}</p>}
    </>
  );
}
