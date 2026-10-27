import Link from "next/link";
import {
  ArrowRightIcon, BookOpenIcon, ChevronRightIcon, CircleCheckIcon, EyeIcon, GitForkIcon, ListChecksIcon, LockIcon,
  GaugeIcon, PuzzleIcon, RouteIcon, ShieldCheckIcon, TerminalIcon, UsersIcon, type LucideIcon,
} from "lucide-react";
import { Eyebrow, ModIcon } from "@/components/atoms";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Key } from "@/modules/i18n";
import type { GridAction } from "@/modules/home";
import { AppWindow } from "./AppWindow";

type T = (key: Key, params?: Record<string, string | number>) => string;

/** Os botões da página inicial: o cheio, o de contorno e o pequeno das células. */
export const BUTTON = "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-primary bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground";
export const OUTLINE = "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-5 text-sm font-medium transition-colors hover:bg-secondary";
const SMALL = "inline-flex h-8 w-fit items-center gap-1.5 rounded-md border border-primary bg-primary px-3 text-small font-medium text-primary-foreground transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground";
const TEXT_LINK = "inline-flex items-center gap-1 text-small font-semibold underline-offset-4 hover:underline";
const tag = "font-mono text-caption tracking-wider text-muted-foreground uppercase";

/** A seta dos botões, que vira junto com a página em árabe. */
function Chevron({ className }: { className?: string }) {
  return <ChevronRightIcon aria-hidden="true" className={cn("size-4 rtl:rotate-180", className)} />;
}

/** O título de uma seção: a linha pequena, o título depois do `❯` e, ao lado,
 * a explicação. */
export function SectionHeading({ kicker, title, note }: { kicker: string; title: string; note?: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <Eyebrow>{kicker}</Eyebrow>
        <h2 className="flex gap-[1ch] text-h1"><span aria-hidden="true" className="text-go">❯</span><span>{title}</span></h2>
      </div>
      {note && <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{note}</p>}
    </div>
  );
}

/** A faixa da novidade da versão: o texto de um lado e, quando ela tem tela,
 * o print do outro. */
export function Spotlight({ t, version, title, detail, shot, modsHref, newsHref }: {
  t: T; version: string; title: string; detail: string; shot: { src: string; alt: string } | null; modsHref: string | null; newsHref: string;
}) {
  return (
    <section aria-labelledby="spotlight-title" className="border-b border-border bg-card">
      <div className={cn("shell grid items-center gap-10 py-16 md:py-20", shot && "lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12")}>
        <div className="grid min-w-0 content-start gap-4">
          <p className={cn(tag, "flex items-center gap-2")}><span aria-hidden="true" className="size-1.5 rounded-full bg-go" />{t("site.spotlight.kicker", { version })}</p>
          <h2 id="spotlight-title" className="text-[clamp(1.5rem,3.5vw,2.25rem)] leading-tight font-semibold tracking-tight">{title}</h2>
          {detail && <p className="max-w-[56ch] text-sm leading-relaxed text-muted-foreground">{detail}</p>}
          <div className="mt-2 flex flex-wrap gap-3">
            {modsHref && <Link href={modsHref} className={BUTTON}>{t("site.spotlight.mods")}<ArrowRightIcon aria-hidden="true" className="size-4 rtl:rotate-180" /></Link>}
            <Link href={newsHref} className={modsHref ? OUTLINE : BUTTON}>{t("site.spotlight.all")}<Chevron /></Link>
          </div>
        </div>
        {shot && <AppWindow src={shot.src} alt={shot.alt} className="min-w-0" />}
      </div>
    </section>
  );
}

/** O ícone de cada célula da grade, pelo id da funcionalidade. */
const GRID_ICONS: Record<string, LucideIcon> = {
  entryGate: ShieldCheckIcon,
  exitGate: CircleCheckIcon,
  answerEvidence: EyeIcon,
  adaptiveRouting: RouteIcon,
  planFirst: ListChecksIcon,
  secondOpinion: UsersIcon,
  parallelTasks: GitForkIcon,
  projectNotes: BookOpenIcon,
  modCatalog: PuzzleIcon,
};

export interface GridCellView { id: string; title: string; detail: string; isNew: boolean; action?: GridAction }

/** A grade de recursos, 3 × 3: ícone, etiqueta, título e uma frase; a última
 * linha leva à página do mod ou ao catálogo. */
export function FeatureGrid({ t, locale, cells }: { t: T; locale: string; cells: GridCellView[] }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
      {cells.map((cell, index) => {
        const Icon = GRID_ICONS[cell.id] ?? PuzzleIcon;
        const href = cell.action?.kind === "mod" ? `/${locale}/mods/${cell.action.mod}` : cell.action?.kind === "catalog" ? `/${locale}/mods` : null;
        return (
          <article key={cell.id} className="flex flex-col gap-3 bg-card p-6">
            <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-md border border-border bg-background"><Icon className="size-4" /></span>
            <span className={tag}>{String(index + 1).padStart(2, "0")} / {t(`site.tag.${cell.id}` as Key)}</span>
            <h3 className="flex flex-wrap items-center gap-2 text-h3">{cell.title}{cell.isNew && <Badge variant="accent" mono>{t("site.grid.new")}</Badge>}</h3>
            <p className="max-w-[48ch] text-sm leading-relaxed text-muted-foreground">{cell.detail}</p>
            {href && (
              <Link href={href} className={cn(SMALL, "mt-auto")}>
                {cell.action?.kind === "catalog" ? t("site.grid.catalog") : t("site.grid.modPage")}<Chevron className="size-3.5" />
              </Link>
            )}
          </article>
        );
      })}
    </div>
  );
}

export interface ShowcaseView { id: string; title: string; detail: string; points: { text: string; open?: boolean }[]; src: string; alt: string; modHref: string; docsHref: string }

/** A vitrine: o texto e o print de cada tela, trocando de lado a cada linha
 * (em árabe, espelhado, como o resto da página). */
export function Showcase({ t, rows }: { t: T; rows: ShowcaseView[] }) {
  return (
    <div className="grid gap-16 md:gap-20">
      {rows.map((row, index) => (
        <div key={row.id} className={cn("flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-12", index % 2 === 1 && "lg:flex-row-reverse")}>
          <div className="grid min-w-0 content-start gap-3.5 lg:flex-[0.8]">
            <span className={tag}>{String(index + 1).padStart(2, "0")} / {t(`site.tag.${row.id}` as Key)}</span>
            <h3 className="text-[clamp(1.25rem,2.5vw,1.625rem)] leading-tight font-semibold">{row.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{row.detail}</p>
            {row.points.length > 0 && (
              <ul className="grid gap-1.5 text-small">
                {/* O que não foi conferido não ganha o ✓ verde, como no app. */}
                {row.points.map((point) => (
                  <li key={point.text} className={cn("flex gap-[1ch]", point.open && "text-muted-foreground")}>
                    <span aria-hidden="true" className={point.open ? undefined : "text-go"}>{point.open ? "○" : "✓"}</span>{point.text}
                  </li>
                ))}
              </ul>
            )}
            <p className="flex flex-wrap gap-4">
              <Link href={row.modHref} className={TEXT_LINK}>{t("site.showcase.modPage")}<Chevron className="size-3.5" /></Link>
              <Link href={row.docsHref} className={TEXT_LINK}>{t("site.showcase.docs")}<Chevron className="size-3.5" /></Link>
            </p>
          </div>
          <AppWindow src={row.src} alt={row.alt} className="min-w-0 lg:flex-[1.2]" />
        </div>
      ))}
    </div>
  );
}

/** Os dois cartões que levam às páginas de dentro: o catálogo de mods e a
 * documentação. */
export function DeepCards({ t, locale }: { t: T; locale: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <article className="flex flex-col gap-3.5 rounded-lg border border-foreground bg-card p-6 sm:p-8">
        <Badge variant="outline" mono className="bg-card">{t("site.deep.mods.tag")}</Badge>
        <h3 className="text-[clamp(1.25rem,2.5vw,1.5rem)] leading-tight font-semibold">{t("site.deep.mods.title")}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("site.deep.mods.detail")}</p>
        <Link href={`/${locale}/mods`} className={cn(BUTTON, "mt-auto w-fit")}>{t("site.deep.mods.cta")}<Chevron /></Link>
      </article>
      <article className="flex flex-col gap-3.5 rounded-lg border border-border bg-card p-6 sm:p-8">
        <Badge variant="outline" mono className="bg-card">{t("site.deep.docs.tag")}</Badge>
        <h3 className="text-[clamp(1.25rem,2.5vw,1.5rem)] leading-tight font-semibold">{t("site.deep.docs.title")}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("site.deep.docs.detail")} <kbd className="rounded-xs border border-border bg-background px-1.5 font-mono text-caption text-foreground">Ctrl K</kbd>
        </p>
        <Link href={`/${locale}/docs`} className={cn(OUTLINE, "mt-auto w-fit")}>{t("site.deep.docs.cta")}<Chevron /></Link>
      </article>
    </div>
  );
}

/** A faixa "funciona com": o ícone e o nome de cada motor e agente do
 * catálogo, cada um levando à página dele. */
export function WorksWith({ t, locale, mods }: { t: T; locale: string; mods: { id: string; title: string; icon?: string }[] }) {
  return (
    <section aria-labelledby="works-with-title" className="border-b border-border bg-card">
      <div className="shell flex flex-col items-center gap-6 py-14 text-center">
        <Eyebrow id="works-with-title" className="mb-0">{t("site.worksWith.title")}</Eyebrow>
        <ul className="flex flex-wrap justify-center gap-x-7 gap-y-3">
          {mods.map((mod) => (
            <li key={mod.id}>
              <Link href={`/${locale}/mods/${mod.id}`} className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-75">
                <ModIcon icon={mod.icon} className="size-5" />{mod.title}
              </Link>
            </li>
          ))}
        </ul>
        <p className="max-w-[64ch] text-small text-muted-foreground">{t("site.worksWith.note")}</p>
        <Link href={`/${locale}/mods`} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3.5 text-small font-medium transition-colors hover:bg-secondary">{t("site.worksWith.cta")}<Chevron className="size-3.5" /></Link>
      </div>
    </section>
  );
}

/** As outras opções embaixo dos downloads: todas as versões, os planos e a
 * linha de comando. */
export function MoreOptions({ t, locale }: { t: T; locale: string }) {
  const options = [
    { href: `/${locale}/releases`, title: t("site.downloads.others.releases.title"), detail: t("site.downloads.others.releases.detail") },
    { href: `/${locale}/plans`, title: t("site.downloads.others.plans.title"), detail: t("site.downloads.others.plans.detail") },
    { href: `/${locale}/docs#cli`, title: t("site.downloads.others.cli.title"), detail: t("site.downloads.others.cli.detail") },
  ];
  return (
    <div className="mt-10">
      <h3 className="text-h4">{t("site.downloads.others.title")}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {options.map((option) => (
          <Link key={option.href} href={option.href} className="grid gap-1 rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground">
            <span className="flex items-center gap-1 text-sm font-semibold">{option.title}<Chevron className="size-3.5" /></span>
            <span className="text-small text-muted-foreground">{option.detail}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** A faixa de privacidade: uma linha só, com o link para a parte do manual
 * sobre o que fica na máquina. */
export function PrivacyBand({ t, locale }: { t: T; locale: string }) {
  return (
    <section className="shell py-10">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-4 rounded-lg border border-border bg-card px-6 py-5">
        <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-md border border-border bg-background"><LockIcon className="size-4" /></span>
        <div className="min-w-0 flex-[1_1_22rem]">
          <p className="font-semibold">{t("site.privacy.title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("site.privacy.detail")}</p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href={`/${locale}/docs#category-privacy`} className={TEXT_LINK}>{t("site.privacy.link")}<Chevron className="size-3.5" /></Link>
          <Link href={`/${locale}/security`} className={TEXT_LINK}>{t("site.privacy.security")}<Chevron className="size-3.5" /></Link>
        </div>
      </div>
    </section>
  );
}

const PROOFS: { id: "verify" | "savings" | "ci"; Icon: LucideIcon; docs: string }[] = [
  { id: "verify", Icon: CircleCheckIcon, docs: "buildValidation" },
  { id: "savings", Icon: GaugeIcon, docs: "savingsBaseline" },
  { id: "ci", Icon: TerminalIcon, docs: "ciRun" },
];

/** A prova do que a frase do topo promete: a validação que roda os testes do
 * próprio projeto, a economia medida contra uma linha de base e o mesmo
 * portão no CI. Cada cartão leva à página do manual. */
export function Proof({ t, locale }: { t: T; locale: string }) {
  return (
    <section id="proof" className="scroll-mt-16 border-b border-border py-16 md:py-20">
      <div className="shell">
        <SectionHeading kicker={t("site.proof.kicker")} title={t("site.proof.title")} note={t("site.proof.note")} />
        <ul className="grid gap-4 md:grid-cols-3">
          {PROOFS.map(({ id, Icon, docs }) => (
            <li key={id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
              <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-md border border-border bg-background"><Icon className="size-4 text-go" /></span>
              <h3 className="text-h4">{t(`site.proof.${id}.title` as Key)}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{t(`site.proof.${id}.detail` as Key)}</p>
              <Link href={`/${locale}/docs#${docs}`} className={cn(TEXT_LINK, "mt-auto")}>{t(`site.proof.${id}.link` as Key)}<Chevron className="size-3.5" /></Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
