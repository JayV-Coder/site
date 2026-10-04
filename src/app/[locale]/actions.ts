"use server";

import { signOut } from "@/auth";

/** Sair do site: o NextAuth apaga o cookie e o evento `signOut` encerra a
 * sessão no Supabase. */
export async function signOutAction(locale: string) {
  await signOut({ redirectTo: `/${locale}` });
}
