"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { BotIcon, CpuIcon, PuzzleIcon, SearchIcon, SparklesIcon, type LucideIcon } from "lucide-react";
import { EmptyText, ModIcon } from "@/components/atoms";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useT, type Key } from "@/modules/i18n";
import { byKind, matchesMod, MOD_KINDS, type ModCard, type ModKind } from "@/modules/mods/pages";
import { categoryOf } from "@/modules/releases/content";
import { cn } from "@/lib/utils";

/** O ícone do tipo, para o mod que não traz o seu. */
const KIND_ICONS: Record<ModKind, LucideIcon> = { llmEngines: CpuIcon, agents: BotIcon, skills: SparklesIcon, features: PuzzleIcon, other: PuzzleIcon };
/** O nome de cada categoria no plural, o mesmo do filtro da aba Mods do app. */
const KIND_GROUPS: Record<ModKind, Key> = {
  llmEngines: "mods.filter.llmEngines", agents: "mods.filter.agents", skills: "mods.filter.skills", features: "mods.filter.features", other: "site.modPages.kind.other",
};

/** O catálogo dos mods: a busca (no título, no resumo, no que o mod faz, no id
 * e no autor), o filtro por categoria e os cartões separados por categoria —
 * o que o mod é (motor de LLM, agente, skill, recurso), como na aba Mods do
 * app. Cada cartão mostra o ícone do mod, diz em que parte do app ele aparece
 * e abre a página dele. */
export function ModCatalogBrowser({ cards, locale }: { cards: ModCard[]; locale: string }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ModKind | "all">("all");
  const wanted = useDeferredValue(query);
  const present = useMemo(() => MOD_KINDS.filter((kind) => cards.some((card) => card.kind === kind)), [cards]);
  const shown = useMemo(() => cards.filter((card) => (category === "all" || card.kind === category)
    && matchesMod(wanted, [card.title, card.summary, card.about, card.id, card.author])), [cards, category, wanted]);
  const groups = byKind(shown);
  const chip = (value: ModKind | "all", label: string) => (
    <button
      key={value}
      type="button"
      aria-pressed={category === value}
      onClick={() => setCategory(value)}
      className={cn(
        "h-8 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        category === value && "border-foreground bg-foreground text-background hover:bg-foreground hover:text-background",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <div className="relative max-w-xl">
          <SearchIcon aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t("site.modPages.search")}
            placeholder={t("site.modPages.searchPlaceholder")} className="h-10 ps-9" />
        </div>
        <div role="group" aria-label={t("site.modPages.category")} className="flex flex-wrap items-center gap-2">
          {chip("all", t("site.modPages.all"))}
          {present.map((kind) => chip(kind, t(KIND_GROUPS[kind])))}
          <span className="ms-auto font-mono text-caption text-muted-foreground" aria-live="polite">{t("site.modPages.count", { count: shown.length })}</span>
        </div>
      </div>

      {groups.length === 0 ? <EmptyText>{t("site.modPages.noResults", { query: wanted.trim() })}</EmptyText> : groups.map(({ kind: group, cards: list }) => (
        <section key={group} aria-labelledby={`mods-${group}`} className="grid gap-3">
          <h2 id={`mods-${group}`} className="flex gap-[1ch] text-h2 font-semibold">
            <span aria-hidden="true" className="text-go">❯</span>{t(KIND_GROUPS[group])}
            <span className="self-center font-mono text-caption font-normal text-muted-foreground">{list.length}</span>
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((card) => (
                <li key={card.id} className="min-w-0">
                  <Link
                    href={`/${locale}/mods/${card.id}`}
                    aria-label={t("site.modPages.open", { name: card.title })}
                    className="group flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/40 hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="flex items-start gap-3">
                      <span aria-hidden="true" className="flex size-10 flex-none items-center justify-center rounded-md border border-border bg-background text-foreground/80 group-hover:text-foreground">
                        <ModIcon icon={card.icon} fallback={KIND_ICONS[card.kind]} className="size-5" />
                      </span>
                      <span className="grid min-w-0 gap-1">
                        <span className="text-h4 font-semibold break-words">{card.title}</span>
                        <span className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary">{t(`site.docs.category.${categoryOf(card.category)}` as Key)}</Badge>
                          {card.required
                            ? <Badge variant="outline" title={t("site.modPages.essential.hint")}>{t("site.modPages.essential")}</Badge>
                            : <Badge variant="outline">{t(card.preinstalled ? "site.modPages.preinstalled" : "site.modPages.optional")}</Badge>}
                        </span>
                      </span>
                    </span>
                    <span className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{card.summary}</span>
                    <span className="mt-auto flex flex-wrap gap-x-3 font-mono text-caption text-muted-foreground">
                      {card.version && <span>{t("site.modPages.version", { version: card.version })}</span>}
                      {card.author && <span>{t("site.modPages.by", { author: card.author })}</span>}
                    </span>
                  </Link>
                </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
