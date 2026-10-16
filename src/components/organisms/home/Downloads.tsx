"use client";

import { useEffect, useState } from "react";
import { DownloadIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocale, useT, type Key } from "@/modules/i18n";
import { PACKAGES, SYSTEMS, detectSystem, findAsset, type Release, type System } from "@/modules/releases/assets";

const NAMES: Record<System, string> = { windows: "Windows", mac: "macOS", linux: "Linux" };

/** O sistema de quem visita só se sabe no navegador: até lá nenhum cartão é
 * marcado, e a página do servidor sai igual para todos. */
export function useSystem() {
  const [system, setSystem] = useState<System | null>(null);
  useEffect(() => setSystem(detectSystem(navigator.userAgent, navigator.platform)), []);
  return system;
}

/** O link do pacote, que passa pela função `releases` do Supabase; sem a
 * versão lida, nenhum (o cartão diz que o pacote não está disponível). */
function packageUrl(release: Release | null, pattern: RegExp) {
  if (!release) return null;
  return findAsset(release.assets, pattern)?.url ?? null;
}

/** Os pacotes de um sistema que a versão publicou, com o link de cada um. */
function packagesOf(release: Release | null, system: System) {
  return PACKAGES.filter((item) => item.system === system).map((item) => ({ ...item, url: packageUrl(release, item.pattern) })).filter((item) => item.url);
}

/** Os cartões dos três sistemas. Quando o navegador diz qual é o de quem
 * visita, o cartão dele cresce, com o primeiro pacote como botão, e os outros
 * dois ficam menores ao lado; até lá, os três saem iguais. */
export function Downloads({ release }: { release: Release | null }) {
  const t = useT();
  const locale = useLocale();
  const system = useSystem();
  const date = release ? new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(release.publishedAt)) : null;
  const meta = release && date ? t("site.downloads.meta", { version: release.version, date }) : t("site.downloads.metaUnknown");

  const card = (id: System, size: "large" | "small" | "even") => {
    const packages = packagesOf(release, id);
    const [first, ...rest] = packages;
    const large = size === "large";
    return (
      <article key={id} className={cn("flex flex-col gap-4 rounded-lg border bg-card", large ? "border-foreground p-6 sm:p-7" : "border-border p-5")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className={large ? "text-h1" : "text-h3"}>{NAMES[id]}</h3>
            <p className="text-xs text-muted-foreground">{t(`site.downloads.${id}.arch` as Key)}</p>
          </div>
          {large && <Badge variant="accent" mono>{t("site.downloads.recommended")}</Badge>}
        </div>
        {packages.length === 0 && <p className="text-xs text-muted-foreground">{t("site.downloads.missing")}</p>}
        {large && first && (
          <a href={first.url!} className="inline-flex h-11 w-fit items-center gap-2 rounded-md border border-primary bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground">
            <DownloadIcon aria-hidden="true" className="size-4" />{t("site.downloads.primary", { package: t(`site.downloads.${first.label}` as Key) })}
          </a>
        )}
        {/* Ao lado do cartão grande, os outros sistemas só levam os links. */}
        {size === "small" && packages.length > 0 && (
          <p className="flex flex-wrap gap-x-4 gap-y-1.5">
            {packages.map((item) => (
              <a key={item.label} href={item.url!} className="inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline">
                {t(`site.downloads.${item.label}` as Key)}<DownloadIcon aria-hidden="true" className="size-3.5 text-muted-foreground" />
              </a>
            ))}
          </p>
        )}
        {size !== "small" && (large ? rest : packages).length > 0 && (
          <div className={cn("grid gap-2", large && "sm:grid-cols-2")}>
            {(large ? rest : packages).map((item) => (
              <a key={item.label} href={item.url!} className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 text-sm transition-colors hover:border-foreground hover:bg-secondary">
                <span>{t(`site.downloads.${item.label}` as Key)}</span>
                <DownloadIcon aria-hidden="true" className="size-4 text-muted-foreground" />
              </a>
            ))}
          </div>
        )}
        <p className="mt-auto font-mono text-caption text-muted-foreground">{meta}</p>
      </article>
    );
  };

  if (!system) return <div className="grid gap-3 md:grid-cols-3">{SYSTEMS.map((id) => card(id, "even"))}</div>;
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      {card(system, "large")}
      <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {SYSTEMS.filter((id) => id !== system).map((id) => card(id, "small"))}
      </div>
    </div>
  );
}

/** O botão grande do topo: baixa o primeiro pacote do sistema de quem visita,
 * ou leva aos cartões quando não dá para saber. */
export function HeroDownload({ release }: { release: Release | null }) {
  const t = useT();
  const system = useSystem();
  const first = system ? PACKAGES.find((item) => item.system === system && packageUrl(release, item.pattern)) : null;
  const href = first ? packageUrl(release, first.pattern)! : "#downloads";
  return (
    <a href={href} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-primary bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground">
      <DownloadIcon className="size-4" />
      {system && first ? t("site.hero.downloadFor", { system: NAMES[system] }) : t("site.hero.download")}
    </a>
  );
}
