import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { userSupabase } from "@/modules/supabase/server";

export interface Access {
  /** Está em `system_admins` (`is_admin()`). */
  admin: boolean;
  /** O plano (e o admin) deixam usar organizações, como o menu do app. */
  organizations: boolean;
}

/** O que quem entrou pode abrir no painel, pelo `my_features()` — o mesmo que
 * o app lê para montar o menu. Nulo sem sessão. Lido uma vez por página. */
export const loadAccess = cache(async (): Promise<Access | null> => {
  const supabase = await userSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("my_features");
  if (error) return { admin: false, organizations: false };
  const me = data as { admin?: boolean; features?: string[] } | null;
  return { admin: me?.admin === true, organizations: (me?.features ?? []).includes("organizations") };
});

/** O painel pede login: quem não entrou vai ao login e volta para `path`. */
export async function requireAccess(locale: string, path: string) {
  const access = await loadAccess();
  if (!access) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}${path}`)}`);
  return access;
}
