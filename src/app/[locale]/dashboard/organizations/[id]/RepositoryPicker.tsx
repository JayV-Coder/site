"use client";

import { useEffect, useState, useTransition } from "react";
import { Building2Icon, CheckIcon, GlobeIcon, LockIcon, SearchIcon, UserRoundIcon } from "lucide-react";
import { EmptyText, LoadingNote, PROVIDER_NAMES, ProviderIcon } from "@/components/atoms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LINK_MAX, repoKey, type GitNamespace, type GitProvider, type GitRepository } from "@/modules/git/providers";
import { useFeedback } from "@/modules/feedback";
import { useT, type Key, type Text } from "@/modules/i18n";
import { cn } from "@/lib/utils";
import { chooseGitNamespace, linkGitRepositories, listGitNamespaces, listGitRepositories } from "../actions";
import type { GitConnection } from "../data";

type Listing =
  | { state: "loading" }
  | { state: "ready"; repositories: GitRepository[]; truncated: boolean }
  | { state: "expired" }
  | { state: "failed"; error: Text | string };

type Spaces =
  | { state: "loading" }
  | { state: "ready"; namespaces: GitNamespace[] }
  | { state: "expired" }
  | { state: "failed"; error: Text | string };

const expiredError = (error: Text | string) => typeof error !== "string" && error.key === "org.gitExpired";

/** Adicionar repositórios, em dois passos. Primeiro a organização do
 * provedor desta organização do JayV (a organização do GitHub, o grupo do
 * GitLab ou o workspace do Bitbucket): cada organização do JayV fica presa à
 * sua, e o passo aparece sempre que ela ainda não foi escolhida (ou quando o
 * owner pede para trocar). Depois, a lista só dessa organização do provedor,
 * para marcar. Tudo vai ao provedor pelo servidor, com o token desta
 * organização; sem token (venceu a hora), o botão entra de novo e a lista
 * reabre na volta. */
export function RepositoryPicker({ org, initial, connections, linked, changeNamespace = false, namespaceFromProvider = () => false, onReconnect, onClose }: {
  org: string;
  initial: GitProvider;
  connections: GitConnection[];
  linked: string[];
  /** Abrir direto na escolha da organização do provedor. */
  changeNamespace?: boolean;
  /** A organização deste provedor é escolhida na tela dele (GitHub App), não
   * aqui: trocar é entrar de novo. */
  namespaceFromProvider?: (provider: GitProvider) => boolean;
  onReconnect: (provider: GitProvider) => void;
  onClose: (changed: boolean) => void;
}) {
  const t = useT();
  const { notify, report } = useFeedback();
  const provider = initial;
  const [query, setQuery] = useState("");
  const [listing, setListing] = useState<Listing>({ state: "loading" });
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, startBusy] = useTransition();
  // A organização do provedor escolhida nesta abertura, por provedor; vale
  // por cima da que veio do banco até a página recarregar.
  const [chosen, setChosen] = useState<Partial<Record<GitProvider, string>>>({});
  const [changing, setChanging] = useState(changeNamespace);
  const [spaces, setSpaces] = useState<Spaces>({ state: "loading" });
  const [changed, setChanged] = useState(false);
  const connection = connections.find((known) => known.provider === provider);
  const account = connection?.account ?? "";
  const namespace = chosen[provider] ?? connection?.namespace ?? null;
  const fromProvider = namespaceFromProvider(provider);
  const step = !fromProvider && (changing || !namespace) ? "namespace" : "repos";
  const name = PROVIDER_NAMES[provider];

  // As organizações do provedor que a conta alcança, no passo de escolher.
  useEffect(() => {
    if (step !== "namespace") return;
    let live = true;
    setSpaces({ state: "loading" });
    listGitNamespaces(org, provider).then((result) => {
      if (!live) return;
      if (result.ok) setSpaces({ state: "ready", namespaces: result.data });
      else setSpaces(expiredError(result.error) ? { state: "expired" } : { state: "failed", error: result.error });
    }).catch((error: unknown) => { if (live) setSpaces({ state: "failed", error: String(error) }); });
    return () => { live = false; };
  }, [org, provider, step]);

  const pickNamespace = (value: string) => startBusy(async () => {
    const result = await chooseGitNamespace(org, provider, value);
    if (!result.ok) {
      if (expiredError(result.error)) setSpaces({ state: "expired" });
      report(result.error);
      return;
    }
    setChosen((current) => ({ ...current, [provider]: value }));
    setChanging(false);
    setChanged(true);
    setSelected([]);
    notify(t("site.org.git.namespace.saved", { provider: name, namespace: value }));
  });

  // A busca espera a pessoa parar de digitar; a resposta de uma busca velha
  // não cobre a nova.
  useEffect(() => {
    if (step !== "repos") return;
    let live = true;
    setListing({ state: "loading" });
    const timer = setTimeout(() => {
      listGitRepositories(org, provider, query).then((result) => {
        if (!live) return;
        if (result.ok) setListing({ state: "ready", ...result.data });
        else if (expiredError(result.error)) setListing({ state: "expired" });
        else setListing({ state: "failed", error: result.error });
      }).catch((error: unknown) => { if (live) setListing({ state: "failed", error: String(error) }); });
    }, query ? 350 : 0);
    return () => { live = false; clearTimeout(timer); };
  }, [org, provider, query, step, namespace]);

  const close = (didChange: boolean) => onClose(didChange || changed);

  const toggle = (path: string, on: boolean) => setSelected((current) => (on ? [...current, path].slice(0, LINK_MAX) : current.filter((item) => item !== path)));

  const submit = () => startBusy(async () => {
    const result = await linkGitRepositories(org, provider, selected);
    if (!result.ok) {
      if (expiredError(result.error)) setListing({ state: "expired" });
      report(result.error);
      return;
    }
    if (result.data.linked > 0) notify(t("site.org.repos.pick.linked", { count: result.data.linked }));
    if (result.data.missing.length > 0) report({ key: "site.org.repos.pick.missing", params: { provider: name, paths: result.data.missing.join(", ") } });
    close(result.data.linked > 0);
  });

  const reconnect = (
    <div className="grid justify-items-start gap-3 p-4">
      <p className="text-sm text-muted-foreground">{t("site.org.repos.pick.expired", { provider: name })}</p>
      <Button size="sm" variant="outline" onClick={() => onReconnect(provider)}><ProviderIcon provider={provider} />{t("site.org.git.reconnect")}</Button>
    </div>
  );

  const failure = (error: Text | string) => (
    <EmptyText className="p-4">{typeof error === "string" ? t("org.gitUnavailable") : t(error.key as Key, error.params)}</EmptyText>
  );

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) close(false); }}>
      <DialogContent closeLabel={t("common.close")} className="sm:max-w-xl" onInteractOutside={(event) => { if (busy) event.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>{step === "namespace" ? t("site.org.git.namespace.title", { provider: name }) : t("site.org.repos.pick.title")}</DialogTitle>
          <DialogDescription>
            {step === "namespace"
              ? t("site.org.git.namespace.description", { provider: name, account })
              : t("site.org.repos.pick.scope", { provider: name, account, namespace: namespace ?? "" })}
          </DialogDescription>
        </DialogHeader>


        {step === "namespace" ? (
          <>
            <div className="max-h-[min(24rem,50dvh)] min-h-32 overflow-y-auto rounded-md border border-border/70">
              {spaces.state === "loading" && <div className="p-4"><LoadingNote>{t("site.org.git.namespace.loading")}</LoadingNote></div>}
              {spaces.state === "failed" && failure(spaces.error)}
              {spaces.state === "expired" && reconnect}
              {spaces.state === "ready" && (spaces.namespaces.length === 0 ? <EmptyText className="p-4">{t("site.org.git.namespace.empty")}</EmptyText> : (
                <ul className="divide-y divide-border/70">
                  {spaces.namespaces.map((space) => {
                    const current = space.name === namespace;
                    return (
                      <li key={space.name}>
                        <button type="button" disabled={busy} onClick={() => pickNamespace(space.name)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-start transition-colors hover:bg-secondary/60 focus-visible:bg-secondary/60 focus-visible:outline-none disabled:opacity-60">
                          {space.personal ? <UserRoundIcon className="size-4 shrink-0 text-muted-foreground" /> : <Building2Icon className="size-4 shrink-0 text-muted-foreground" />}
                          <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)]">
                            <span className="truncate text-sm font-medium">{space.label}</span>
                            <span className="truncate font-mono text-xs text-muted-foreground">{space.name}</span>
                          </span>
                          {space.personal && <Badge variant="secondary">{t("site.org.git.namespace.personal")}</Badge>}
                          {current && <CheckIcon className="size-4 shrink-0 text-success" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ))}
            </div>
            <DialogFooter>
              {namespace && changing && <Button type="button" variant="outline" disabled={busy} onClick={() => setChanging(false)}>{t("site.org.git.namespace.back")}</Button>}
              <Button type="button" variant="outline" disabled={busy} onClick={() => close(false)}>{t("common.cancel")}</Button>
            </DialogFooter>
          </>
        ) : (
        <>
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <Building2Icon className="size-3.5 shrink-0" /><span className="truncate font-mono">{namespace}</span>
            </span>
            <Button type="button" variant="link" size="xs" disabled={busy} onClick={() => (fromProvider ? onReconnect(provider) : setChanging(true))}>
              {t("site.org.git.namespace.change")}
            </Button>
          </div>
          <div className="relative">
            <SearchIcon aria-hidden="true" className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" aria-label={t("site.org.repos.pick.search")} placeholder={t("site.org.repos.pick.placeholder")} className="ps-8"
              autoCapitalize="none" spellCheck={false} value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        </div>

        <div className="max-h-[min(24rem,50dvh)] min-h-32 overflow-y-auto rounded-md border border-border/70">
          {listing.state === "loading" && <div className="p-4"><LoadingNote>{t("site.org.repos.pick.loading")}</LoadingNote></div>}
          {listing.state === "failed" && failure(listing.error)}
          {listing.state === "expired" && reconnect}
          {listing.state === "ready" && (listing.repositories.length === 0 ? <EmptyText className="p-4">{t("site.org.repos.pick.empty")}</EmptyText> : (
            <ul className="divide-y divide-border/70">
              {listing.repositories.map((repository) => {
                const already = linked.includes(repoKey(repository.provider, repository.path));
                const on = already || selected.includes(repository.path);
                const id = `pick-${repository.provider}-${repository.path}`;
                return (
                  <li key={repository.path}>
                    <label htmlFor={id} className={cn("flex items-start gap-3 px-3 py-2.5", already ? "cursor-default opacity-70" : "cursor-pointer hover:bg-secondary/60")}>
                      <Checkbox id={id} className="mt-0.5" checked={on} disabled={already || (!on && selected.length >= LINK_MAX)}
                        onCheckedChange={(checked) => toggle(repository.path, checked === true)} />
                      <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] gap-0.5">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="min-w-0 truncate font-mono text-sm">{repository.name}</span>
                          {repository.private !== null && (
                            <Badge variant="outline">{repository.private ? <LockIcon /> : <GlobeIcon />}{t(repository.private ? "site.org.repos.private" : "site.org.repos.public")}</Badge>
                          )}
                          {already && <Badge variant="secondary">{t("site.org.repos.pick.added")}</Badge>}
                        </span>
                        {repository.description && <span className="line-clamp-1 text-xs text-muted-foreground">{repository.description}</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          ))}
        </div>
        {listing.state === "ready" && listing.truncated && <p className="text-xs text-muted-foreground">{t("site.org.repos.pick.truncated")}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => close(false)}>{t("common.cancel")}</Button>
          <Button type="button" loading={busy} disabled={selected.length === 0} onClick={submit}>{t("site.org.repos.pick.submit", { count: selected.length })}</Button>
        </DialogFooter>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
