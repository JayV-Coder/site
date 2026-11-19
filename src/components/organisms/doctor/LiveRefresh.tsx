"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/modules/supabase/config";

/** O Realtime do Supabase no lugar da releitura periódica (ADR-0026 do jayv-doctor): quando uma
 * das tabelas da Organização ativa muda (um worker abriu um Incidente, publicou um Diagnóstico),
 * a página do servidor é relida. O RLS vale também aqui: só chegam mudanças da Organização, e
 * quem perdeu o Vínculo deixa de recebê-las. Se o Realtime cair, volta a reler de tempos em
 * tempos, como antes. */
export function LiveRefresh({ tenantId, tables, fallbackSeconds = 60 }: { tenantId: string; tables: string[]; fallbackSeconds?: number }) {
  const router = useRouter();
  const key = tables.join(",");

  useEffect(() => {
    let stopped = false;
    let client: SupabaseClient | null = null;
    let channel: RealtimeChannel | null = null;
    let debounce: number | undefined;
    let polling: number | undefined;

    // Várias mudanças seguidas (um lote do worker) viram uma releitura só.
    const refresh = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => { if (document.visibilityState === "visible") router.refresh(); }, 800);
    };
    const poll = () => { polling ??= window.setInterval(refresh, fallbackSeconds * 1000); };

    // O token é o da sessão do site (o mesmo das leituras do servidor); renovado a cada 30 min,
    // antes de o Supabase derrubar o canal por token vencido.
    const token = async () => {
      const response = await fetch("/api/auth/session", { cache: "no-store" }).catch(() => null);
      const session = (await response?.json().catch(() => null)) as { accessToken?: string } | null;
      return session?.accessToken ?? null;
    };

    const start = async () => {
      const access = await token();
      if (stopped) return;
      if (!access) { poll(); return; }
      client = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      await client.realtime.setAuth(access);
      channel = client.channel(`doctor:${tenantId}:${key}`);
      for (const table of tables) {
        channel.on("postgres_changes", { event: "*", schema: "doctor", table, filter: `tenant_id=eq.${tenantId}` }, refresh);
      }
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") { window.clearInterval(polling); polling = undefined; }
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") poll();
      });
    };

    void start();
    const renew = window.setInterval(() => {
      void token().then((access) => { if (access && client) void client.realtime.setAuth(access); });
    }, 30 * 60 * 1000);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      stopped = true;
      window.clearTimeout(debounce);
      window.clearInterval(polling);
      window.clearInterval(renew);
      document.removeEventListener("visibilitychange", refresh);
      if (client && channel) void client.removeChannel(channel);
    };
    // `tables` entra pela `key`: um array novo com o mesmo conteúdo não reabre o canal.
  }, [router, tenantId, key, fallbackSeconds]);

  return null;
}
