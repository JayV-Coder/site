"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { isText, useT, type Key } from "@/modules/i18n";

/** O aviso da tela, como no app: chave do i18n vira texto no idioma da
 * página; frase solta do servidor vai como motivo de `error.unexpected`. */
export function useFeedback() {
  const t = useT();
  const notify = useCallback((message: string, failed = false) => (failed ? toast.error(message) : toast.success(message)), []);
  const report = useCallback((error: unknown) => {
    console.error(error);
    if (isText(error)) toast.error(t(error.key as Key, error.params));
    else toast.error(t("error.unexpected", { reason: error instanceof Error ? error.message : String(error) }));
  }, [t]);
  return { notify, report };
}
