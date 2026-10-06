"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Building2Icon, ExternalLinkIcon, GitBranchIcon, GlobeIcon, LockIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { EmptyText, PROVIDER_NAMES, ProviderIcon } from "@/components/atoms";
import { ConfirmAction, SettingsSection } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GitProvider } from "@/modules/git/providers";
import { GIT_PROVIDERS, isGitProvider } from "@/modules/git/providers";
import { useFeedback } from "@/modules/feedback";
import { useLocale, useT } from "@/modules/i18n";
import { disconnectGit, removeRepository, startGitConnection } from "../actions";
import type { OrganizationDetail } from "../data";
import { RepositoryPicker } from "./RepositoryPicker";

export type GitOutcome = "connected" | "denied" | "requested" | "forbidden" | "failed";

/** O provedor git e os repositórios da organização. O owner conecta o
 * GitHub, o GitLab ou o Bitbucket (o login abre no provedor e volta por
 * `/api/git/callback`) e escolhe os repositórios da lista dele; o app de cada
 * membro lê esta lista e clona com o acesso git da própria pessoa. Os outros
 * papéis só veem. */
export function RepositoriesSection({ detail, outcome }: {
  detail: OrganizationDetail; outcome: { kind: GitOutcome; provider: string | null; pick: boolean; chosen?: boolean } | null;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { notify, report } = useFeedback();
  const [busy, startBusy] = useTransition();
  const [running, setRunning] = useState<string | null>(null);
  const [picking, setPicking] = useState<GitProvider | null>(null);
  // Abrir o diálogo direto na escolha da organização do provedor.
  const [changingNamespace, setChangingNamespace] = useState(false);
  const shown = useRef(false);
  const org = detail.organization;
  const owner = org.role === "owner";
  const connected = GIT_PROVIDERS.filter((provider) => detail.connections.some((connection) => connection.provider === provider));
  const day = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));

  // A volta do provedor chega no endereço: o aviso sai uma vez, a lista abre
  // se o owner pediu para adicionar, e o endereço fica limpo.
  useEffect(() => {
    if (!outcome || shown.current) return;
    shown.current = true;
    const provider = outcome.provider && isGitProvider(outcome.provider) ? outcome.provider : null;
    const name = provider ? PROVIDER_NAMES[provider] : "";
    if (outcome.kind === "connected") {
      notify(t("site.org.git.done", { provider: name }));
      // Depois de cada entrada no provedor, a escolha da organização do
      // provedor; no GitHub, só quando ela não veio da tela de instalar.
      if (provider && outcome.pick) {
        setChangingNamespace(!outcome.chosen);
        setPicking(provider);
      }
    } else if (outcome.kind === "denied") report({ key: "site.org.git.denied", params: { provider: name } });
    else if (outcome.kind === "requested") report({ key: "site.org.git.requested", params: { provider: name } });
    else if (outcome.kind === "forbidden") report({ key: "org.forbidden" });
    else report({ key: "site.org.git.failed", params: { provider: name } });
    router.replace(`${pathname}?tab=repositories`);
  }, [outcome, notify, report, t, router, pathname]);

  const connect = (provider: GitProvider, pick = false) => startBusy(async () => {
    setRunning(`connect:${provider}`);
    const result = await startGitConnection(org.id, provider, locale, pick);
    if (!result.ok) {
      setRunning(null);
      report(result.error);
      return;
    }
    window.location.assign(result.data);
  });

  const disconnect = (provider: GitProvider) => startBusy(async () => {
    setRunning(`disconnect:${provider}`);
    const result = await disconnectGit(org.id, provider);
    setRunning(null);
    if (!result.ok) {
      report(result.error);
      return;
    }
    notify(t("site.org.git.disconnected", { provider: PROVIDER_NAMES[provider] }));
    router.refresh();
  });

  const remove = (id: string) => startBusy(async () => {
    setRunning(`remove:${id}`);
    const result = await removeRepository(id);
    setRunning(null);
    if (!result.ok) {
      report(result.error);
      return;
    }
    notify(t("site.org.repos.removed"));
    router.refresh();
  });

  return (
    // As colunas não crescem com o conteúdo: um caminho longo trunca em vez
    // de alargar a página no celular.
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <SettingsSection title={t("site.org.git.title")} description={t("site.org.git.description")}>
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {GIT_PROVIDERS.map((provider) => {
            const connection = detail.connections.find((known) => known.provider === provider);
            const available = detail.providers.includes(provider);
            const name = PROVIDER_NAMES[provider];
            return (
              <li key={provider} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-border/70 px-3 py-2.5">
                {/* Estreito, os botões descem para a linha de baixo em vez de
                    cortar a conta conectada. */}
                <div className="flex min-w-0 flex-[1_1_14rem] items-center gap-3">
                  <ProviderIcon provider={provider} className="size-5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{name}</p>
                    <p className="flex items-baseline gap-1.5 text-xs break-words text-muted-foreground">
                      {connection && <span aria-hidden="true" className="size-1.5 shrink-0 translate-y-[-1px] rounded-full bg-success" />}
                      <span className="min-w-0">
                        {connection
                          ? `${t("site.org.git.connected", { account: connection.account })} · ${t("site.org.git.since", { date: day(connection.connectedAt) })}`
                          : available ? t("site.org.git.notConnected") : t("site.org.git.unavailable")}
                      </span>
                    </p>
                    {/* A organização do provedor a que esta organização do JayV
                        está presa: só os repositórios dela entram aqui. */}
                    {connection && (
                      <p className={`mt-0.5 flex items-center gap-1.5 text-xs break-words ${connection.namespace ? "text-muted-foreground" : "text-warning"}`}>
                        <Building2Icon className="size-3.5 shrink-0" />
                        <span className="min-w-0">
                          {connection.namespace
                            ? t("site.org.git.namespace", { namespace: connection.namespace })
                            : t("site.org.git.namespace.none", { provider: name })}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                {owner && (
                  <div className="ms-auto flex flex-wrap gap-1">
                    {available && (
                      // Cada clique passa de novo pela tela do provedor: a conta
                      // ou a organização é escolhida lá (ou logo na volta), só
                      // para esta organização do JayV.
                      <Button variant={connection ? "default" : "outline"} size="sm" loading={running === `connect:${provider}`} disabled={busy} onClick={() => connect(provider, true)}>
                        {connection ? <><PlusIcon />{t("site.org.repos.add")}</> : t("site.org.git.connect")}
                      </Button>
                    )}
                    {connection && (
                      <ConfirmAction title={t("site.org.git.disconnect.title", { provider: name })} description={t("site.org.git.disconnect.description", { provider: name })}
                        confirm={t("site.org.git.disconnect")} onConfirm={() => disconnect(provider)}>
                        <Button variant="ghost" size="sm" loading={running === `disconnect:${provider}`} disabled={busy}>{t("site.org.git.disconnect")}</Button>
                      </ConfirmAction>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {!owner && <p className="text-xs text-muted-foreground">{t("site.org.git.ownerOnly")}</p>}
      </SettingsSection>

      <SettingsSection title={t("org.repos.title")} description={t("site.org.repos.description")}>
        {owner && connected.length === 0 && <p className="text-xs text-muted-foreground">{t("site.org.repos.connectFirst")}</p>}
        {detail.repositories.length === 0 ? <EmptyText>{t("org.repos.empty")}</EmptyText> : (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
            {detail.repositories.map((repository) => (
              <li key={repository.id} className="grid grid-cols-[minmax(0,1fr)] gap-1 rounded-md border border-border/70 px-3 py-2.5">
                {/* O caminho fica com a linha toda (só os botões ao lado); os
                    selos e a descrição vão embaixo, alinhados a ele. */}
                <div className="flex items-center gap-2">
                  <ProviderIcon provider={repository.provider} className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-mono text-sm" title={repository.repoKey}>{repository.path}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    {repository.webUrl && (
                      <Button asChild variant="ghost" size="icon-sm">
                        <a href={repository.webUrl} target="_blank" rel="noreferrer noopener" aria-label={t("site.org.repos.open", { provider: PROVIDER_NAMES[repository.provider] })}
                          title={t("site.org.repos.open", { provider: PROVIDER_NAMES[repository.provider] })}><ExternalLinkIcon /></a>
                      </Button>
                    )}
                    {owner && (
                      <ConfirmAction title={t("org.repos.remove.title")} description={t("org.repos.remove.description", { repo: repository.repoKey })}
                        confirm={t("org.repos.remove")} onConfirm={() => remove(repository.id)}>
                        <Button variant="ghost" size="icon-sm" aria-label={t("org.repos.remove")} title={t("org.repos.remove")}
                          loading={running === `remove:${repository.id}`} disabled={busy}
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2Icon /></Button>
                      </ConfirmAction>
                    )}
                  </div>
                </div>
                {(repository.private !== null || repository.defaultBranch || repository.linkedVia === "url") && (
                  <div className="flex flex-wrap items-center gap-1.5 ps-6">
                    {repository.private !== null && (
                      <Badge variant="outline">{repository.private ? <LockIcon /> : <GlobeIcon />}{t(repository.private ? "site.org.repos.private" : "site.org.repos.public")}</Badge>
                    )}
                    {repository.defaultBranch && <Badge variant="secondary" className="max-w-full"><GitBranchIcon /><span className="truncate">{repository.defaultBranch}</span></Badge>}
                    {repository.linkedVia === "url" && <Badge variant="secondary">{t("site.org.repos.manual")}</Badge>}
                  </div>
                )}
                {repository.description && <p className="line-clamp-2 ps-6 text-xs text-muted-foreground">{repository.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>

      {owner && picking && (
        <RepositoryPicker org={org.id} initial={picking} connections={detail.connections} changeNamespace={changingNamespace}
          linked={detail.repositories.map((repository) => repository.repoKey)}
          onReconnect={(provider) => connect(provider, true)}
          onClose={(changed) => {
            setPicking(null);
            if (changed) router.refresh();
          }} />
      )}
    </div>
  );
}
