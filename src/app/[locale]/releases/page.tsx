import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenIcon, DownloadIcon, SparklesIcon, WrenchIcon } from "lucide-react";
import { EmptyText } from "@/components/atoms";
import { PageHeading } from "@/components/molecules";
import { SitePage } from "@/components/organisms/SitePage";
import { Badge } from "@/components/ui/badge";
import type { Key } from "@/modules/i18n";
import { getContentTexts, getT } from "@/modules/i18n/server";
import { localized, versionAnchor, type ChangeKind, type ChangeRelease } from "@/modules/releases/content";
import { changelog, latestRelease } from "@/modules/releases/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/releases">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.releases.title")} · JayV`, description: t("site.releases.description") };
}

const GROUPS: { kind: ChangeKind; label: Key; Icon: typeof SparklesIcon; tone: string }[] = [
  { kind: "feature", label: "site.releases.features", Icon: SparklesIcon, tone: "text-success" },
  { kind: "fix", label: "site.releases.fixes", Icon: WrenchIcon, tone: "text-info" },
];

/** Uma versão: o número, o dia e os itens em dois grupos, novidades primeiro,
 * como a janela "Novidades" do app. */
function ReleaseNotes({ release, latest, texts, locale, t }: {
  release: ChangeRelease;
  latest: boolean;
  texts: Record<string, string>;
  locale: string;
  t: (key: Key, params?: Record<string, string | number>) => string;
}) {
  // A data é só o dia: lida como meio-dia UTC, não muda de dia em fuso nenhum.
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${release.date}T12:00:00Z`));
  const anchor = versionAnchor(release.version);
  return (
    <section id={anchor} aria-labelledby={`${anchor}-title`} className="scroll-mt-20 rounded-lg border border-border bg-card p-5 sm:p-6">
      <header className="mb-4 flex flex-wrap items-center gap-2">
        <h2 id={`${anchor}-title`} className="text-h3 font-semibold">
          <a href={`#${anchor}`} className="hover:underline">{t("site.releases.version", { version: release.version })}</a>
        </h2>
        {latest && <Badge variant="success">{t("site.releases.latest")}</Badge>}
        <span className="text-caption text-muted-foreground">{day}</span>
      </header>
      <div className="grid gap-4">
        {GROUPS.map(({ kind, label, Icon, tone }) => {
          const items = release.items.filter((item) => item.kind === kind);
          if (!items.length) return null;
          return (
            <div key={kind} className="grid gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                <Icon aria-hidden="true" className={`size-3.5 ${tone}`} />
                {t(label)}
              </h3>
              <ul className="grid gap-2.5">
                {items.map((item) => (
                  <li key={item.id} className="rounded-md border border-border bg-muted/40 px-3.5 py-2.5">
                    <p className="text-sm font-medium text-foreground">{localized(texts, `whatsNew.item.${item.id}.title`, item.title ?? item.id)}</p>
                    {(item.detail || texts[`whatsNew.item.${item.id}.detail`]) && (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{localized(texts, `whatsNew.item.${item.id}.detail`, item.detail)}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** As notas de todas as versões do app, lidas pela função `releases` do
 * Supabase. À esquerda (no celular, em cima) o índice das versões. */
export default async function ReleasesPage({ params }: PageProps<"/[locale]/releases">) {
  const { locale } = await params;
  const [t, releases, latest, texts] = await Promise.all([getT(locale), changelog(), latestRelease(), getContentTexts(locale, "whatsNew.item")]);

  return (
    <SitePage locale={locale}>
      <div className="shell py-8 md:py-12">
        <PageHeading eyebrow={t("site.releases.eyebrow")} title={t("site.releases.title")} description={t("site.releases.description")}>
          <Link href={`/${locale}/docs`} className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3.5 text-sm font-medium transition-colors hover:bg-secondary">
            <BookOpenIcon className="size-4" />{t("site.nav.docs")}
          </Link>
          {latest && (
            <Link href={`/${locale}#downloads`} className="inline-flex h-9 items-center gap-2 rounded-md border border-primary bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground">
              <DownloadIcon className="size-4" />{t("site.releases.download", { version: latest.version })}
            </Link>
          )}
        </PageHeading>

        {releases && releases.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-8">
            <nav aria-label={t("site.releases.versions")} className="-mx-4 flex gap-1 overflow-x-auto border-b border-border/70 px-4 pb-3 [scrollbar-width:none] md:sticky md:top-20 md:mx-0 md:max-h-[calc(100dvh-7rem)] md:flex-col md:self-start md:overflow-y-auto md:border-0 md:px-0 md:pb-0">
              <p className="hidden px-3 pb-1 font-mono text-caption tracking-wider text-muted-foreground uppercase md:block">{t("site.releases.versions")}</p>
              {releases.map((release, index) => (
                <a key={release.version} href={`#${versionAnchor(release.version)}`}
                  className="flex flex-none items-center justify-between gap-2 rounded-md px-3 py-1.5 font-mono text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                  <span>v{release.version}</span>
                  {index === 0 && <span aria-hidden="true" className="size-1.5 rounded-full bg-go" />}
                </a>
              ))}
            </nav>
            <div className="grid min-w-0 gap-4">
              {releases.map((release, index) => (
                <ReleaseNotes key={release.version} release={release} latest={index === 0} texts={texts} locale={locale} t={t} />
              ))}
            </div>
          </div>
        ) : <EmptyText>{t("site.releases.empty")}</EmptyText>}
      </div>
    </SitePage>
  );
}
