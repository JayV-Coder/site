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

export function Downloads({ release }: { release: Release | null }) {
  const t = useT();
  const locale = useLocale();
  const system = useSystem();
  const date = release ? new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(release.publishedAt)) : null;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {SYSTEMS.map((id) => {
        const packages = PACKAGES.filter((item) => item.system === id).map((item) => ({ ...item, url: packageUrl(release, item.pattern) })).filter((item) => item.url);
        const mine = system === id;
        return (
          <article key={id} className={cn("flex flex-col gap-4 rounded-lg border bg-card p-5", mine ? "border-foreground" : "border-border")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-h3">{NAMES[id]}</h3>
                <p className="text-xs text-muted-foreground">{t(`site.downloads.${id}.arch` as Key)}</p>
              </div>
              {mine && <Badge variant="accent" mono>{t("site.downloads.recommended")}</Badge>}
            </div>
            <div className="grid gap-2">
              {packages.length === 0 && <p className="text-xs text-muted-foreground">{t("site.downloads.missing")}</p>}
              {packages.map((item) => (
                <a key={item.label} href={item.url!} className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 text-sm transition-colors hover:border-foreground hover:bg-secondary">
                  <span>{t(`site.downloads.${item.label}` as Key)}</span>
                  <DownloadIcon className="size-4 text-muted-foreground" />
                </a>
              ))}
            </div>
            <p className="mt-auto font-mono text-caption text-muted-foreground">
              {release && date ? t("site.downloads.meta", { version: release.version, date }) : t("site.downloads.metaUnknown")}
            </p>
          </article>
        );
      })}
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
