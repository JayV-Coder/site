import "server-only";
import { cache } from "react";
import { auth } from "@/auth";
import { userSupabase } from "@/modules/supabase/server";

/** Quem está vendo a página, como o cabeçalho mostra: o nome e a foto do
 * perfil (a que a pessoa escolheu no painel ou, sem ela, a do provedor), com o
 * que veio no login como reserva. Nulo sem sessão. */
export interface Viewer { name: string; email: string | null; photo: string | null }

const https = (value: unknown) => (typeof value === "string" && value.startsWith("https://") ? value : null);

export const currentViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth();
  if (!session?.accessToken) return null;
  const email = session.user?.email ?? null;
  let profile: { display_name?: string | null; avatar_url?: string | null } | null = null;
  try {
    const supabase = await userSupabase();
    const { data } = (await supabase?.from("profiles").select("display_name,avatar_url").maybeSingle()) ?? { data: null };
    profile = data;
  } catch (error) {
    // Sem o perfil, o cabeçalho segue com o que veio no login.
    console.error("viewer", error);
  }
  return {
    name: profile?.display_name?.trim() || session.user?.name?.trim() || email?.split("@")[0] || "",
    email,
    photo: https(profile?.avatar_url) ?? https(session.user?.image),
  };
});
