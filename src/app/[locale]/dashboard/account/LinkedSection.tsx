"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PROVIDER_NAMES, ProviderIcon } from "@/components/atoms";
import { ConfirmAction, SettingsSection } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { canUnlink, isProvider, PROVIDERS, type Provider } from "@/modules/auth/identities";
import { useFeedback } from "@/modules/feedback";
import { useLocale, useT } from "@/modules/i18n";
import { linkProvider, unlinkProvider } from "./actions";

export type LinkResult = "linked" | "taken" | "failed";

/** GitHub, GitLab e Bitbucket, trazidos da aba Contas vinculadas do app:
 * vincular abre o provedor e volta por `/dashboard/account/link`;
 * desvincular fica travado enquanto for a única forma de entrar. */
export function LinkedSection({ providers, hasPassword, result }: {
  providers: string[]; hasPassword: boolean; result: { kind: LinkResult; provider: string | null } | null;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { notify, report } = useFeedback();
  const [busy, startBusy] = useTransition();
  const [linking, setLinking] = useState<Provider | null>(null);
  const shown = useRef(false);

  // A volta do provedor chega no endereço; o aviso sai uma vez e o endereço
  // fica limpo.
  useEffect(() => {
    if (!result || shown.current) return;
    shown.current = true;
    const name = result.provider && isProvider(result.provider) ? PROVIDER_NAMES[result.provider] : "";
    if (result.kind === "linked") notify(t("linked.done", { provider: name }));
    else if (result.kind === "taken") report({ key: "linked.taken", params: { provider: name } });
    else report({ key: "site.callback.failed" });
    router.replace(`${pathname}?tab=linked`);
  }, [result, notify, report, t, router, pathname]);

  const link = (provider: Provider) => {
    setLinking(provider);
    startBusy(async () => {
      const outcome = await linkProvider(provider, locale);
      if (!outcome.ok) {
        setLinking(null);
        report(outcome.error);
        return;
      }
      window.location.assign(outcome.data);
    });
  };

  const unlink = (provider: Provider) => startBusy(async () => {
    const outcome = await unlinkProvider(provider);
    if (!outcome.ok) report(outcome.error);
    router.refresh();
  });

  return (
    <SettingsSection title={t("linked.title")} description={t("linked.description")}>
      <ul className="grid gap-2">
        {PROVIDERS.map((provider) => {
          const linked = providers.includes(provider);
          const name = PROVIDER_NAMES[provider];
          const removable = canUnlink(providers, hasPassword, provider);
          return (
            <li key={provider} className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-2.5">
              <ProviderIcon provider={provider} className="size-5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">{linked ? t("linked.on") : t("linked.off")}</p>
              </div>
              {linked ? (
                removable ? (
                  <ConfirmAction title={t("linked.unlink.title", { provider: name })} description={t("linked.unlink.description", { provider: name })} confirm={t("linked.unlink")} onConfirm={() => unlink(provider)}>
                    <Button type="button" variant="outline" size="sm" disabled={busy}>{t("linked.unlink")}</Button>
                  </ConfirmAction>
                ) : (
                  // O botão desativado não recebe o mouse: a dica fica no invólucro.
                  <span title={t("auth.lastIdentity")}><Button type="button" variant="outline" size="sm" disabled>{t("linked.unlink")}</Button></span>
                )
              ) : (
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => link(provider)}>
                  {linking === provider ? t("auth.waitingBrowser") : t("linked.link")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </SettingsSection>
  );
}
