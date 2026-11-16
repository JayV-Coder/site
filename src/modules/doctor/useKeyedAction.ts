"use client";

import { useRef, useState, useTransition } from "react";
import type { Text } from "@/modules/i18n/types";

export const OFFLINE: Text = { key: "site.doctor.error.offline" };

/** Uma escrita com chave de idempotência: a chave fica a mesma enquanto o pedido for o mesmo
 * (repetir depois de uma resposta perdida devolve o mesmo resultado) e muda depois de dar certo,
 * quando quem preenche recomeça (`reset`) ou quando a impressão do pedido (`fingerprint`, o corpo
 * por exemplo) muda: aí já é outro pedido. */
export function useKeyedAction() {
  const key = useRef<string | null>(null);
  const last = useRef<string | undefined>(undefined);
  const [error, setError] = useState<Text | null>(null);
  const [busy, startBusy] = useTransition();
  return {
    busy,
    error,
    reset: () => { setError(null); key.current = null; },
    run: (send: (key: string) => Promise<Text | null>, done?: () => void, fingerprint?: string) => {
      if (key.current === null || (fingerprint !== undefined && fingerprint !== last.current)) key.current = crypto.randomUUID();
      last.current = fingerprint;
      const current = key.current;
      startBusy(async () => {
        const failed = await send(current).catch((): Text => OFFLINE);
        setError(failed);
        if (failed === null) { key.current = null; done?.(); }
      });
    },
  };
}
