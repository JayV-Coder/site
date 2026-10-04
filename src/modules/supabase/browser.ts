"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

let client: SupabaseClient | null = null;

/** O cliente do Supabase no navegador, só para entrar: senha, provedor,
 * segundo fator, cadastro e recuperação. PKCE porque a volta do provedor e do
 * e-mail chega por link (`/auth/callback`), e o código só vale com o
 * verificador guardado aqui. Assim que a sessão passa para o NextAuth, o
 * navegador esquece os tokens (`forgetBrowserSession`). */
export function browserSupabase() {
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

/** Tira do `localStorage` a sessão que o supabase-js guardou: daqui em diante
 * quem a guarda é o cookie do NextAuth. Não chama `signOut`, que revogaria o
 * token recém-entregue. */
export function forgetBrowserSession() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("sb-") && !key.endsWith("-code-verifier")) localStorage.removeItem(key);
    }
  } catch {
    // Sem armazenamento, não há o que esquecer.
  }
}
