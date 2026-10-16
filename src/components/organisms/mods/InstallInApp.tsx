"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckIcon, DownloadIcon, ExternalLinkIcon, LogInIcon } from "lucide-react";
import { OptionSelect } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFeedback } from "@/modules/feedback";
import { useT } from "@/modules/i18n";
import { syncLink } from "@/modules/mods/appLink";
import { changeMod } from "@/app/[locale]/dashboard/mods/actions";

/** Instalar o mod no JayV, do topo da página dele. Só com a pessoa logada no
 * site: o botão grava o mod no estado dos mods do ambiente escolhido (a mesma
 * gravação do Painel › Mods, com as dependências) e abre o link que faz o app
 * sincronizar na hora. Sem sessão, leva ao login e volta para cá. */
export function InstallInApp({ mod, name, signedIn, loginHref, environments, installedIn }: {
  mod: string;
  name: string;
  signedIn: boolean;
  loginHref: string;
  environments: { id: string; name: string }[];
  installedIn: string[];
}) {
  const t = useT();
  const { notify, report } = useFeedback();
  const [environment, setEnvironment] = useState(environments[0]?.id ?? "personal");
  const [installed, setInstalled] = useState(() => new Set(installedIn));
  const [opening, setOpening] = useState(false);
  const [busy, startBusy] = useTransition();

  if (!signedIn) {
    return (
      <div className="grid gap-2 rounded-lg border border-border bg-card p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <p className="text-sm text-muted-foreground">{t("site.modPages.install.signInHint")}</p>
        <Button asChild className="w-fit"><Link href={loginHref}><LogInIcon aria-hidden="true" />{t("site.modPages.install.signIn")}</Link></Button>
      </div>
    );
  }

  const open = () => {
    setOpening(true);
    window.location.href = syncLink(mod, environment);
  };
  const install = () => startBusy(async () => {
    const result = await changeMod(environment, { id: mod, action: "install" });
    if (!result.ok) { report(result.error); return; }
    setInstalled((current) => new Set(current).add(environment));
    notify(t("site.modPages.install.done", { name }));
    open();
  });
  const here = installed.has(environment);

  return (
    <div className="grid gap-3 rounded-lg border border-foreground bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        {environments.length > 1 && (
          <div className="w-56 max-w-full">
            <OptionSelect
              label={t("site.modPages.install.environment")}
              value={environment}
              options={environments.map((item) => ({ value: item.id, label: item.name }))}
              onChange={(next) => { setEnvironment(next); setOpening(false); }}
              disabled={busy}
            />
          </div>
        )}
        {here ? (
          <>
            <Badge variant="success" className="gap-1"><CheckIcon aria-hidden="true" />{t("site.modPages.install.installed")}</Badge>
            <Button type="button" variant="outline" onClick={open}><ExternalLinkIcon aria-hidden="true" />{t("site.modPages.install.open")}</Button>
          </>
        ) : (
          <Button type="button" onClick={install} disabled={busy}><DownloadIcon aria-hidden="true" />{t("site.modPages.install.button")}</Button>
        )}
      </div>
      {opening && <p role="status" className="text-xs text-muted-foreground">{t("site.modPages.install.opening")}</p>}
    </div>
  );
}
