"use client";

import { useState, useTransition } from "react";
import type { Text } from "@/modules/i18n/types";

/** Uma escrita com chave de idempotência: a chave fica a mesma enquanto o pedido for o mesmo
 * (repetir depois de uma resposta perdida devolve o mesmo resultado) e muda depois de dar certo
 * ou quando quem preenche recomeça (`reset`). */
export function useKeyedAction() {
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [error, setError] = useState<Text | null>(null);
  const [busy, startBusy] = useTransition();
  return {
    busy,
    error,
    reset: () => { setError(null); setKey(crypto.randomUUID()); },
    run: (send: (key: string) => Promise<Text | null>, done?: () => void) => {
      startBusy(async () => {
        const failed = await send(key).catch((): Text => ({ key: "site.doctor.error.offline" }));
        setError(failed);
        if (failed === null) { setKey(crypto.randomUUID()); done?.(); }
      });
    },
  };
}
