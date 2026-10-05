"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { HashIcon, KeyboardIcon, MessageSquareIcon, SearchIcon, TerminalIcon } from "lucide-react";
import { EmptyText } from "@/components/atoms";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useT, type Key } from "@/modules/i18n";
import { byCategory, COMMAND_KINDS, matches, shortcutText, type CommandKind, type ManualCommand } from "@/modules/releases/content";

export interface FeatureView {
  id: string;
  category: string;
  since: string | null;
  plan: boolean;
  commands: string[];
  title: string;
  summary: string;
  usage: string;
}
export interface ManualView { version: string | null; features: FeatureView[]; commands: ManualCommand[] }

const KIND_ICONS: Record<CommandKind, typeof TerminalIcon> = { chat: MessageSquareIcon, shortcut: KeyboardIcon, cli: TerminalIcon };

const commandAnchor = (id: string) => `command-${id}`;

/** O que se digita: o atalho nas duas grafias (Ctrl no Windows e no Linux, ⌘
 * no Mac); o resto, como está. */
function Usage({ command, ctrl }: { command: ManualCommand; ctrl: string }) {
  const code = "rounded-xs border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground";
  if (command.kind !== "shortcut") return <code className={code}>{command.usage}</code>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <kbd className={code}>{shortcutText(command.usage, false, ctrl)}</kbd>
      <span aria-hidden="true" className="text-muted-foreground">/</span>
      <kbd className={code}>{shortcutText(command.usage, true)}</kbd>
    </span>
  );
}

/** A documentação navegável: a busca, o índice por categoria e, embaixo, os
 * comandos do chat, do teclado e do terminal. */
export function ManualBrowser({ manual }: { manual: ManualView }) {
  const t = useT();
  const ctrl = t("site.docs.ctrl");
  const [query, setQuery] = useState("");
  const wanted = useDeferredValue(query);
  const commandsById = useMemo(() => new Map(manual.commands.map((command) => [command.id, command])), [manual.commands]);

  const features = useMemo(() => manual.features.filter((feature) => matches(
    wanted, feature.title, feature.summary, feature.usage,
    ...feature.commands.map((id) => commandsById.get(id)?.usage),
  )), [manual.features, wanted, commandsById]);
  const commands = useMemo(() => manual.commands.filter((command) => matches(wanted, command.usage, command.detail)), [manual.commands, wanted]);
  const groups = byCategory(features);
  const commandGroups = COMMAND_KINDS.map((kind) => ({ kind, list: commands.filter((command) => command.kind === kind) })).filter((group) => group.list.length > 0);
  const nothing = groups.length === 0 && commandGroups.length === 0;

  return (
    <div className="grid gap-6">
      <div className="relative max-w-xl">
        <SearchIcon aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t("site.docs.search")}
          placeholder={t("site.docs.searchPlaceholder")} className="h-10 ps-9" />
      </div>

      {nothing ? <EmptyText>{t("site.docs.noResults", { query: wanted.trim() })}</EmptyText> : (
        <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
          <nav aria-label={t("site.docs.contents")} className="-mx-4 flex gap-1 overflow-x-auto border-b border-border/70 px-4 pb-3 [scrollbar-width:none] lg:sticky lg:top-20 lg:mx-0 lg:max-h-[calc(100dvh-7rem)] lg:flex-col lg:gap-0.5 lg:self-start lg:overflow-y-auto lg:border-0 lg:px-0 lg:pb-0">
            <p className="hidden px-3 pb-1 font-mono text-caption tracking-wider text-muted-foreground uppercase lg:block">{t("site.docs.contents")}</p>
            {groups.map(({ category, features: list }) => (
              <div key={category} className="contents lg:block">
                <a href={`#category-${category}`} className="flex flex-none items-center rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:font-medium lg:text-foreground">
                  {t(`site.docs.category.${category}` as Key)}
                </a>
                <div className="hidden lg:grid lg:gap-0.5 lg:pb-1.5">
                  {list.map((feature) => (
                    <a key={feature.id} href={`#${feature.id}`} className="truncate rounded-md py-1 ps-6 pe-3 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">{feature.title}</a>
                  ))}
                </div>
              </div>
            ))}
            {commandGroups.length > 0 && (
              <a href="#commands" className="flex flex-none items-center rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:mt-1 lg:border-t lg:border-border lg:pt-2.5 lg:font-medium lg:text-foreground">
                {t("site.docs.commands")}
              </a>
            )}
          </nav>

          <div className="grid min-w-0 gap-10">
            {groups.map(({ category, features: list }) => (
              <section key={category} id={`category-${category}`} aria-labelledby={`category-${category}-title`} className="grid scroll-mt-20 gap-3">
                <h2 id={`category-${category}-title`} className="flex gap-[1ch] text-h2 font-semibold">
                  <span aria-hidden="true" className="text-go">❯</span>{t(`site.docs.category.${category}` as Key)}
                </h2>
                <div className="grid gap-3">
                  {list.map((feature) => (
                    <article key={feature.id} id={feature.id} aria-labelledby={`${feature.id}-title`} className="group scroll-mt-20 rounded-lg border border-border bg-card p-5">
                      <header className="flex flex-wrap items-center gap-2">
                        <h3 id={`${feature.id}-title`} className="text-h3 font-semibold">{feature.title}</h3>
                        <a href={`#${feature.id}`} aria-label={t("site.docs.link", { title: feature.title })}
                          className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100">
                          <HashIcon className="size-3.5" />
                        </a>
                        <span className="ms-auto flex flex-wrap gap-1.5">
                          {feature.plan && <Badge variant="outline">{t("site.docs.plan")}</Badge>}
                          {feature.since && <Badge variant="secondary" mono>{t("site.docs.since", { version: feature.since })}</Badge>}
                        </span>
                      </header>
                      <p className="mt-2 text-sm leading-relaxed text-foreground/90">{feature.summary}</p>
                      <div className="mt-3 rounded-md border border-border bg-muted/40 px-3.5 py-2.5">
                        <p className="font-mono text-caption tracking-wider text-muted-foreground uppercase">{t("site.docs.howTo")}</p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{feature.usage}</p>
                      </div>
                      {feature.commands.length > 0 && (
                        <ul aria-label={t("site.docs.commands")} className="mt-3 flex flex-wrap gap-1.5">
                          {feature.commands.map((id) => commandsById.get(id)).filter((command): command is ManualCommand => !!command).map((command) => (
                            <li key={command.id}>
                              <a href={`#${commandAnchor(command.id)}`} className="inline-flex rounded-xs hover:opacity-80">
                                <code className="rounded-xs border border-border bg-background px-1.5 py-0.5 font-mono text-xs">{command.kind === "shortcut" ? shortcutText(command.usage, false, ctrl) : command.usage}</code>
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}

            {commandGroups.length > 0 && (
              <section id="commands" aria-labelledby="commands-title" className="grid scroll-mt-20 gap-3">
                <h2 id="commands-title" className="flex gap-[1ch] text-h2 font-semibold"><span aria-hidden="true" className="text-go">❯</span>{t("site.docs.commands")}</h2>
                {commandGroups.map(({ kind, list }) => {
                  const Icon = KIND_ICONS[kind];
                  return (
                    <div key={kind} className="overflow-hidden rounded-lg border border-border bg-card">
                      <div className="flex items-start gap-3 border-b border-border px-5 py-3.5">
                        <Icon aria-hidden="true" className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <h3 className="text-h4 font-semibold">{t(`site.docs.commands.${kind}` as Key)}</h3>
                          <p className="text-xs text-muted-foreground">{t(`site.docs.commands.${kind}.detail` as Key)}</p>
                        </div>
                      </div>
                      <dl className="divide-y divide-border">
                        {list.map((command) => (
                          <div key={command.id} id={commandAnchor(command.id)} className="grid scroll-mt-20 gap-1.5 px-5 py-3 sm:grid-cols-[minmax(10rem,14rem)_1fr] sm:gap-4">
                            <dt><Usage command={command} ctrl={ctrl} /></dt>
                            <dd className="text-sm leading-relaxed text-muted-foreground">{command.detail}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  );
                })}
              </section>
            )}
          </div>
        </div>
      )}
      {manual.version && <p className="font-mono text-caption text-muted-foreground">{t("site.docs.version", { version: manual.version })}</p>}
    </div>
  );
}
