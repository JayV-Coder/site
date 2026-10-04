import "server-only";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/auth";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

/** O Supabase com o token de quem entrou: o banco aplica o RLS, o segundo
 * fator e o `is_admin()` como faz com o app. Nulo sem sessão válida. */
export async function userSupabase() {
  const session = await auth();
  if (!session?.accessToken) return null;
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${session.accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
