"use client";

import { useState } from "react";
import { PROVIDER_NAMES } from "@/components/atoms";
import { ProviderButton } from "@/components/molecules";
import { authFailure } from "@/modules/auth/errors";
import { PROVIDERS, type Provider } from "@/modules/auth/identities";
import { useFeedback } from "@/modules/feedback";
import { useLocale, useT } from "@/modules/i18n";
import { browserSupabase } from "@/modules/supabase/browser";

/** GitHub, GitLab e Bitbucket pelo Supabase, como no app. O provedor volta
 * para `/auth/callback` deste site, que termina a entrada. */
export function ProviderButtons({ next, disabled }: { next: string; disabled?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const { report } = useFeedback();
  const [chosen, setChosen] = useState<Provider | null>(null);

  const go = async (provider: Provider) => {
    setChosen(provider);
    const redirectTo = `${window.location.origin}/${locale}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await browserSupabase().auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) {
      setChosen(null);
      report(authFailure(error));
    }
  };

  return (
    <div className="grid gap-2">
      <p className="flex items-center gap-3 text-caption tracking-wider text-muted-foreground uppercase before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">{t("auth.or")}</p>
      {PROVIDERS.map((provider) => (
        <ProviderButton key={provider} provider={provider} disabled={disabled || chosen !== null} loading={chosen === provider} onClick={() => void go(provider)}
          label={chosen === provider ? t("auth.waitingBrowser") : t("auth.continueWith", { provider: PROVIDER_NAMES[provider] })} />
      ))}
    </div>
  );
}
