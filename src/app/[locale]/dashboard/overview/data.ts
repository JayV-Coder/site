import "server-only";
import { parseMyOverview, parseSystemOverview, type MyOverview, type Period, type SystemOverview } from "@/modules/overview";
import { userSupabase } from "@/modules/supabase/server";

/** O uso da própria conta (`my_dashboard`), lido com o token de quem entrou.
 * Nulo sem sessão ou se o banco recusar. */
export async function loadMyOverview(days: Period): Promise<MyOverview | null> {
  const supabase = await userSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("my_dashboard", { days });
  if (error) {
    console.error("my_dashboard", error.message);
    return null;
  }
  return parseMyOverview(data);
}

/** O sistema inteiro (`admin_dashboard`): o banco confere se quem pede é
 * admin. Nulo sem sessão ou se o banco recusar. */
export async function loadSystemOverview(days: Period): Promise<SystemOverview | null> {
  const supabase = await userSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_dashboard", { days });
  if (error) {
    console.error("admin_dashboard", error.message);
    return null;
  }
  return parseSystemOverview(data);
}
