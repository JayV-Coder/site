"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/modules/supabase/config";

/** Intervalo mínimo entre duas releituras: uma Organização movimentada muda Incidentes a cada
 * segundo, e cada releitura refaz as leituras da página. */
const GAP_MS = 5000;

/** O instante (ms) em que o JWT vence, pelo `exp`; nulo se não der para ler. */
function expiresAt(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** O Realtime do Supabase no lugar da releitura periódica (ADR-0026 do jayv-doctor): quando uma
 * das tabelas da Organização ativa muda (um worker abriu um Incidente, publicou um Diagnóstico),
 * a página do servidor é relida. O RLS vale também aqui: só chegam mudanças da Organização, e
 * quem perdeu o Vínculo deixa de recebê-las. Se o Realtime cair, relê a cada `fallbackSeconds`;
 * com `everySeconds`, relê também nesse ritmo (o que não está no Realtime, como o agregado de
 * Execuções do painel). */
export function LiveRefresh({ tenantId, tables, fallbackSeconds = 60, everySeconds }: {
  tenantId: string; tables: string[]; fallbackSeconds?: number; everySeconds?: number;
}) {
  const router = useRouter();
  const key = tables.join(",");

  useEffect(() => {
    let stopped = false;
    let client: SupabaseClient | null = null;
    let channel: RealtimeChannel | null = null;
    let pending: number | undefined;
    let polling: number | undefined;
    let last = 0;
    let cached: { token: string; until: number } | null = null;

    // No máximo uma releitura a cada GAP_MS; a que chegar no meio fica para o fim do intervalo.
    const refresh = () => {
      if (stopped || pending !== undefined) return;
      const wait = Math.max(0, last + GAP_MS - Date.now());
      pending = window.setTimeout(() => {
        pending = undefined;
        if (stopped || document.visibilityState !== "visible") return;
        last = Date.now();
        router.refresh();
      }, wait);
    };
    const poll = () => { if (!stopped) polling ??= window.setInterval(refresh, fallbackSeconds * 1000); };
    const every = everySeconds ? window.setInterval(refresh, everySeconds * 1000) : undefined;

    // O token da sessão do site (o mesmo das leituras do servidor), guardado até 1 min antes do
    // `exp`; o Realtime o pede de novo a cada heartbeat.
    const accessToken = async (): Promise<string | null> => {
      if (cached && Date.now() < cached.until) return cached.token;
      const response = await fetch("/api/auth/session", { cache: "no-store" }).catch(() => null);
      const session = (await response?.json().catch(() => null)) as { accessToken?: string } | null;
      const token = session?.accessToken ?? null;
      cached = token ? { token, until: (expiresAt(token) ?? Date.now() + 5 * 60 * 1000) - 60 * 1000 } : null;
      return token;
    };

    const start = async () => {
      const first = await accessToken();
      if (stopped) return;
      if (!first) { poll(); return; }
      client = createClient(SUPABASE_URL, SUPABASE_KEY, { accessToken });
      // O cliente define o token do Realtime em segundo plano; o canal só entra depois dele, ou
      // entraria sem o RLS de quem está vendo.
      await client.realtime.setAuth();
      if (stopped) { void client.removeAllChannels(); return; }
      channel = client.channel(`doctor:${tenantId}:${key}`);
      for (const table of tables) {
        channel.on("postgres_changes", { event: "*", schema: "doctor", table, filter: `tenant_id=eq.${tenantId}` }, refresh);
      }
      channel.subscribe((status) => {
        if (stopped) return;
        if (status === "SUBSCRIBED") { window.clearInterval(polling); polling = undefined; }
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") poll();
      });
    };

    void start();
    document.addEventListener("visibilitychange", refresh);

    return () => {
      stopped = true;
      window.clearTimeout(pending);
      window.clearInterval(polling);
      window.clearInterval(every);
      document.removeEventListener("visibilitychange", refresh);
      if (client) void client.removeAllChannels();
    };
    // `tables` entra pela `key`: um array novo com o mesmo conteúdo não reabre o canal.
  }, [router, tenantId, key, fallbackSeconds, everySeconds]);

  return null;
}
