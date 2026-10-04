"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingNote } from "@/components/atoms";
import { Button } from "@/components/ui/button";
import { nextStep, useHandoff } from "@/modules/auth/handoff";
import { safeNext } from "@/modules/auth/next";
import { useFeedback } from "@/modules/feedback";
import { useHref, useT } from "@/modules/i18n";
import { browserSupabase } from "@/modules/supabase/browser";
import { AuthShell } from "./AuthShell";
import { SecondFactorForm } from "./SecondFactorForm";

/** A volta do provedor, da confirmação de e-mail ou do link de recuperação.
 * O supabase-js troca o código pela sessão com o verificador do PKCE que
 * guardou; a recuperação segue para a senha nova com a sessão ainda no
 * navegador, e o resto passa para o NextAuth. */
export function Callback() {
  const t = useT();
  const href = useHref();
  const router = useRouter();
  const query = useSearchParams();
  const handoff = useHandoff();
  const { report } = useFeedback();
  const [state, setState] = useState<"working" | "secondFactor" | "failed">("working");
  const [email, setEmail] = useState<string | null>(null);
  const started = useRef(false);
  const next = safeNext(query.get("next"), href("/"));

  useEffect(() => {
    // O modo estrito do React roda o efeito duas vezes; o código só vale uma.
    if (started.current) return;
    started.current = true;
    const code = query.get("code");
    // O link de troca de senha que o admin manda (página Usuários) não tem
    // PKCE — abre num navegador que não pediu nada — e traz a sessão no `#`.
    // Só vale para recuperação e só segue para a senha nova, que mostra de
    // que conta é: um link montado com a sessão de outra conta não entra
    // direto no site.
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const implicit = !code && fragment.get("type") === "recovery" && next === href("/new-password") && fragment.get("access_token") && fragment.get("refresh_token")
      ? { access_token: fragment.get("access_token")!, refresh_token: fragment.get("refresh_token")! }
      : null;
    if (query.get("error") || fragment.get("error") || (!code && !implicit)) {
      setState("failed");
      return;
    }
    void (async () => {
      const supabase = browserSupabase();
      const { data, error } = code ? await supabase.auth.exchangeCodeForSession(code) : await supabase.auth.setSession(implicit!);
      if (implicit) window.history.replaceState(null, "", window.location.pathname + window.location.search);
      if (error || !data.session) {
        setState("failed");
        return;
      }
      setEmail(data.session.user.email ?? null);
      if (next === href("/new-password")) {
        router.replace(next);
        return;
      }
      if ((await nextStep()) === "secondFactor") {
        setState("secondFactor");
        return;
      }
      await handoff(next, data.session).catch((failure) => {
        report(failure);
        setState("failed");
      });
    })();
  }, [query, next, href, router, handoff, report]);

  if (state === "secondFactor") return <SecondFactorForm email={email} onVerified={() => handoff(next)} onCancel={() => router.replace(href("/login"))} />;
  if (state === "failed") {
    return (
      <AuthShell title={t("auth.title")}>
        <p role="alert" className="text-center text-sm text-muted-foreground">{t("site.callback.failed")}</p>
        <Button asChild variant="outline"><Link href={href("/login")}>{t("auth.backToSignIn")}</Link></Button>
      </AuthShell>
    );
  }
  return <LoadingNote>{t("site.callback.working")}</LoadingNote>;
}
