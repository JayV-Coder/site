"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import type { Session } from "@supabase/supabase-js";
import { browserSupabase, forgetBrowserSession } from "@/modules/supabase/browser";
import { authFailure } from "./errors";
import { needsSecondFactor } from "./mfa";

/** O que falta depois da senha (ou do provedor): nada, ou o código do app
 * autenticador. */
export async function nextStep(): Promise<"done" | "secondFactor"> {
  const { data } = await browserSupabase().auth.mfa.getAuthenticatorAssuranceLevel();
  return needsSecondFactor(data) ? "secondFactor" : "done";
}

/** O código do app autenticador, como no app (`verifySecondFactor`). */
export async function verifySecondFactor(code: string) {
  const supabase = browserSupabase();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw authFailure(error);
  const factor = data?.totp[0];
  if (!factor) throw authFailure({ code: "mfa_factor_not_found" });
  const verified = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
  if (verified.error) throw authFailure(verified.error);
}

/** Entrega a sessão do Supabase ao NextAuth e segue para `next`. O servidor
 * confere o token com o Supabase (e o segundo fator) antes de aceitar. */
export function useHandoff() {
  const router = useRouter();
  return useCallback(async (next: string, session?: Session | null) => {
    const current = session ?? (await browserSupabase().auth.getSession()).data.session;
    if (!current) throw { key: "site.session.failed" };
    const result = await signIn("supabase", { accessToken: current.access_token, refreshToken: current.refresh_token, redirect: false });
    if (!result || result.error) throw { key: "site.session.failed" };
    forgetBrowserSession();
    router.replace(next);
    router.refresh();
  }, [router]);
}
