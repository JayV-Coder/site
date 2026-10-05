"use client";

import { useEffect, useState, useTransition } from "react";
import { GlobeIcon, LockIcon, SearchIcon } from "lucide-react";
import { EmptyText, LoadingNote, PROVIDER_NAMES, ProviderIcon } from "@/components/atoms";
import { SegmentedControl } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LINK_MAX, repoKey, type GitProvider, type GitRepository } from "@/modules/git/providers";
import { useFeedback } from "@/modules/feedback";
import { useT, type Key, type Text } from "@/modules/i18n";
import { cn } from "@/lib/utils";
import { linkGitRepositories, listGitRepositories } from "../actions";
import type { GitConnection } from "../data";

type Listing =
  | { state: "loading" }
  | { state: "ready"; repositories: GitRepository[]; truncated: boolean }
  | { state: "expired" }
  | { state: "failed"; error: Text | string };

/** A lista do provedor conectado, para o owner marcar os repositórios da
 * organização. A busca vai ao provedor (pelo servidor, com o token do cookie);
 * o que já está na organização aparece marcado e travado. Sem token (venceu
 * a hora), o botão entra de novo e a lista reabre na volta. */
export function RepositoryPicker({ org, connected, initial, connections, linked, onReconnect, onClose }: {
  org: string;
  connected: GitProvider[];
  initial: GitProvider;
  connections: GitConnection[];
  linked: string[];
  onReconnect: (provider: GitProvider) => void;
  onClose: (changed: boolean) => void;
}) {
  const t = useT();
  const { notify, report } = useFeedback();
  const [provider, setProvider] = useState<GitProvider>(initial);
  const [query, setQuery] = useState("");
  const [listing, setListing] = useState<Listing>({ state: "loading" });
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, startBusy] = useTransition();
  const account = connections.find((connection) => connection.provider === provider)?.account ?? "";
  const name = PROVIDER_NAMES[provider];

  // A busca espera a pessoa parar de digitar; a resposta de uma busca velha
  // não cobre a nova.
  useEffect(() => {
    let live = true;
    setListing({ state: "loading" });
    const timer = setTimeout(() => {
      listGitRepositories(org, provider, query).then((result) => {
        if (!live) return;
        if (result.ok) setListing({ state: "ready", ...result.data });
        else if (typeof result.error !== "string" && result.error.key === "org.gitExpired") setListing({ state: "expired" });
        else setListing({ state: "failed", error: result.error });
      }).catch((error: unknown) => { if (live) setListing({ state: "failed", error: String(error) }); });
    }, query ? 350 : 0);
    return () => { live = false; clearTimeout(timer); };
  }, [org, provider, query]);

  const choose = (next: GitProvider) => {
    setProvider(next);
    setSelected([]);
  };

  const toggle = (path: string, on: boolean) => setSelected((current) => (on ? [...current, path].slice(0, LINK_MAX) : current.filter((item) => item !== path)));

  const submit = () => startBusy(async () => {
    const result = await linkGitRepositories(org, provider, selected);
    if (!result.ok) {
      if (typeof result.error !== "string" && result.error.key === "org.gitExpired") setListing({ state: "expired" });
      report(result.error);
      return;
    }
    if (result.data.linked > 0) notify(t("site.org.repos.pick.linked", { count: result.data.linked }));
    if (result.data.missing.length > 0) report({ key: "site.org.repos.pick.missing", params: { provider: name, paths: result.data.missing.join(", ") } });
    onClose(result.data.linked > 0);
  });

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(false); }}>
      <DialogContent closeLabel={t("common.close")} className="sm:max-w-xl" onInteractOutside={(event) => { if (busy) event.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>{t("site.org.repos.pick.title")}</DialogTitle>
          <DialogDescription>{t("site.org.repos.pick.description", { provider: name, account })}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {connected.length > 1 && (
            <SegmentedControl label={t("site.org.git.title")} value={provider} onChange={choose}
              options={connected.map((value) => ({ value, label: PROVIDER_NAMES[value], icon: <ProviderIcon provider={value} className="size-3.5" /> }))} />
          )}
          <div className="relative">
            <SearchIcon aria-hidden="true" className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" aria-label={t("site.org.repos.pick.search")} placeholder={t("site.org.repos.pick.placeholder")} className="ps-8"
              autoCapitalize="none" spellCheck={false} value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        </div>

        <div className="max-h-[min(24rem,50dvh)] min-h-32 overflow-y-auto rounded-md border border-border/70">
          {listing.state === "loading" && <div className="p-4"><LoadingNote>{t("site.org.repos.pick.loading")}</LoadingNote></div>}
          {listing.state === "failed" && (
            <EmptyText className="p-4">{typeof listing.error === "string" ? t("org.gitUnavailable") : t(listing.error.key as Key, listing.error.params)}</EmptyText>
          )}
          {listing.state === "expired" && (
            <div className="grid justify-items-start gap-3 p-4">
              <p className="text-sm text-muted-foreground">{t("site.org.repos.pick.expired", { provider: name })}</p>
              <Button size="sm" variant="outline" onClick={() => onReconnect(provider)}><ProviderIcon provider={provider} />{t("site.org.git.reconnect")}</Button>
            </div>
          )}
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
          <Button type="button" variant="outline" disabled={busy} onClick={() => onClose(false)}>{t("common.cancel")}</Button>
          <Button type="button" loading={busy} disabled={selected.length === 0} onClick={submit}>{t("site.org.repos.pick.submit", { count: selected.length })}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
