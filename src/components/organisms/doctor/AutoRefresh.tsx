"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redesenha a página do servidor de tempos em tempos, só com a aba visível. Faz o papel do
 * Realtime do app antigo: o token fica no servidor, e a página relê pela API. */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => { if (document.visibilityState === "visible") router.refresh(); };
    const timer = window.setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, [router, seconds]);
  return null;
}
