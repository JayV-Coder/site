import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { Eyebrow } from "@/components/atoms";
import { AppWindow } from "@/components/organisms/home/AppWindow";
import { Downloads, HeroDownload } from "@/components/organisms/home/Downloads";
import {
  DeepCards, FeatureGrid, MoreOptions, OUTLINE, PrivacyBand, Proof, SectionHeading, Showcase, Spotlight, WorksWith,
  type GridCellView, type ShowcaseView,
} from "@/components/organisms/home/HomeSections";
import { ReleaseToast } from "@/components/organisms/home/ReleaseToast";
import { Trace } from "@/components/organisms/home/Trace";
import { SitePage } from "@/components/organisms/SitePage";
import { Badge } from "@/components/ui/badge";
import { HERO_SHOT, SHOWCASE, currentRelease, gridCells, highlights, manualById, shotUrl, spotlight, worksWith } from "@/modules/home";
import type { Key } from "@/modules/i18n";
import { getContentTexts, getT } from "@/modules/i18n/server";
import { modText } from "@/modules/mods/rules";
import { modCatalog, modPages } from "@/modules/mods/server";
import { cheapestPaid, formatPlanPrice } from "@/modules/plans/price";
import { publicPlans } from "@/modules/plans/public";
import { localized, versionAnchor } from "@/modules/releases/content";
import { changelog, latestRelease, manual } from "@/modules/releases/server";

const STEPS = [1, 2, 3, 4] as const;

/** A página inicial, no ritmo de quem mostra o app antes de explicá-lo: a tela
 * de verdade no topo com as novidades da versão, a faixa da novidade com o
 * print dela, a grade de recursos, a vitrine das telas, o fluxo, as páginas de
 * dentro, os agentes que o JayV coordena e os downloads. Os prints são os das
 * páginas dos mods, no idioma da página (`@/modules/home`); sem eles, cada
 * seção sai só com o texto. */
export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  // O preço do "a partir de" sai na moeda do país do idioma (pt-BR → reais).
  const [t, release, releases, manualData, pages, catalog, news, docs, plans] = await Promise.all([
    getT(locale), latestRelease(), changelog(), manual(), modPages(), modCatalog(),
    getContentTexts(locale, "whatsNew.item"), getContentTexts(locale, "docs"), publicPlans(locale.split("-")[1] ?? null),
  ]);
  const starting = cheapestPaid(plans ?? []);
  const startingPrice = starting ? formatPlanPrice(starting, locale) : null;

  const current = currentRelease(releases, release?.version ?? null);
  const version = release?.version ?? current?.version ?? null;
  const newsHref = current ? `/${locale}/releases#${versionAnchor(current.version)}` : `/${locale}/releases`;
  const itemText = (id: string, title: string | null, detail: string | null) => ({
    title: localized(news, `whatsNew.item.${id}.title`, title ?? id),
    detail: localized(news, `whatsNew.item.${id}.detail`, detail),
  });

  const heroSrc = shotUrl(pages, HERO_SHOT, locale);
  const toast = highlights(current).map((item) => ({ id: item.id, ...itemText(item.id, item.title, item.detail) }));
  const featured = spotlight(current);
  const featuredText = featured ? itemText(featured.item.id, featured.item.title, featured.item.detail) : null;
  const featuredSrc = featured?.shot ? shotUrl(pages, featured.shot, locale) : null;

  const features = manualById(manualData);
  const docText = (id: string, field: "title" | "summary") => localized(docs, `docs.${id}.${field}`, features.get(id)?.[field]);
  const cells: GridCellView[] = gridCells(manualData, version).map((cell) => ({
    id: cell.id,
    action: cell.action,
    isNew: cell.isNew,
    title: docText(cell.id, "title"),
    // O resumo do manual sobre os mods é a página inteira deles: a grade diz
    // numa frase.
    detail: cell.id === "modCatalog" ? t("site.grid.modsDetail") : docText(cell.id, "summary"),
  }));
  const rows: ShowcaseView[] = SHOWCASE.flatMap((row) => {
    const src = shotUrl(pages, row.shot, locale);
    if (!src || !features.has(row.id)) return [];
    return [{
      id: row.id,
      src,
      title: t(`site.showcase.${row.id}.title` as Key),
      alt: t(`site.shot.${row.shot.mod}.${row.shot.name}` as Key),
      detail: docText(row.id, "summary"),
      points: (row.points ?? []).map((point) => ({ text: t(`site.showcase.${row.id}.${point.id}` as Key), open: point.open })),
      modHref: `/${locale}/mods/${row.shot.mod}`,
      docsHref: `/${locale}/docs#${row.id}`,
    }];
  });
  const agents = worksWith(catalog).map((manifest) => ({ id: manifest.id, title: modText(manifest.title, locale), icon: manifest.icon }));

  return (
    <SitePage locale={locale}>
      <section className="grid-bg border-b border-border">
        <div className="shell flex flex-col items-center py-16 text-center md:py-24">
          {version ? (
            <Link href={newsHref} className="mb-6 inline-flex items-center gap-2 rounded-xs border border-border bg-card px-2 py-1 font-mono text-caption tracking-wider uppercase transition-colors hover:bg-secondary">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-go" />{t("site.hero.newRelease", { version })}<ChevronRightIcon aria-hidden="true" className="size-3 rtl:rotate-180" />
            </Link>
          ) : (
            <Badge variant="outline" mono className="mb-6 gap-2 bg-card px-2 py-1"><span aria-hidden="true" className="size-1.5 rounded-full bg-go" />{t("site.hero.eyebrow")}</Badge>
          )}
          <h1 className="text-[clamp(2rem,6vw,3.5rem)] leading-[1.05] font-semibold tracking-tight">
            {t("site.hero.title")}<br /><span className="highlight">{t("site.hero.highlight")}</span>
          </h1>
          <p className="mt-6 max-w-[64ch] text-sm leading-relaxed text-muted-foreground sm:text-base">{t("site.hero.copy")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <HeroDownload release={release} />
            <Link href={`/${locale}/releases`} className={OUTLINE}>{t("site.hero.notes")}</Link>
          </div>
          <p className="mt-4 font-mono text-caption text-muted-foreground">
            {release ? t("site.hero.release", { version: release.version }) : t("site.hero.releaseUnknown")}
          </p>
          <Link href={`/${locale}/plans`} className="mt-2 text-small text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            {starting && startingPrice
              ? t(starting.interval === "year" ? "site.hero.priceYear" : "site.hero.price", { plan: starting.name, price: startingPrice })
              : t("site.hero.priceFree")}
          </Link>

          {/* A tela de verdade, com o bloco da rota no canto. No celular, um
              embaixo do outro. */}
          <div className={heroSrc ? "relative mt-12 w-full text-start md:mt-16 lg:pb-16" : "mt-12 w-full max-w-xl text-start"}>
            {heroSrc && <AppWindow src={heroSrc} alt={t("site.shot.claude.chat")} label={version ? `jayv · v${version}` : "jayv"} priority className="lg:ms-auto lg:w-[82%]" />}
            <div className={heroSrc ? "mt-4 lg:absolute lg:start-0 lg:bottom-0 lg:z-10 lg:mt-0 lg:w-[24rem]" : undefined}>
              <Trace t={t} />
            </div>
          </div>
        </div>
      </section>

      <Proof t={t} locale={locale} />

      {featured && featuredText && current && (
        <Spotlight
          t={t} version={current.version} title={featuredText.title} detail={featuredText.detail} newsHref={newsHref}
          shot={featuredSrc ? { src: featuredSrc, alt: featuredText.title } : null}
          modsHref={featured.mods ? `/${locale}/mods` : null}
        />
      )}

      {cells.length > 0 && (
        <section id="features" className="scroll-mt-16 border-b border-border py-16 md:py-20">
          <div className="shell">
            <SectionHeading kicker={t("site.features.kicker")} title={t("site.features.title")} note={t("site.features.note")} />
            <FeatureGrid t={t} locale={locale} cells={cells} />
          </div>
        </section>
      )}

      {rows.length > 0 && (
        <section className="border-b border-border py-16 md:py-20">
          <div className="shell">
            <SectionHeading kicker={t("site.showcase.kicker")} title={t("site.showcase.title")} note={t("site.showcase.note")} />
            <Showcase t={t} rows={rows} />
          </div>
        </section>
      )}

      <section id="how" className="scroll-mt-16 border-b border-border py-16 md:py-20">
        <div className="shell grid overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-2">
          <div className="p-6 sm:p-10">
            <Eyebrow>{t("site.how.kicker")}</Eyebrow>
            <h2 className="flex gap-[1ch] text-h1"><span aria-hidden="true" className="text-go">❯</span><span>{t("site.how.title")}</span></h2>
            <p className="mt-4 max-w-[54ch] text-sm leading-relaxed text-muted-foreground">{t("site.how.detail")}</p>
          </div>
          <ol className="border-t border-border lg:border-t-0 lg:border-s">
            {STEPS.map((step) => (
              <li key={step} className="grid grid-cols-[3rem_1fr] gap-2 border-b border-border px-6 py-5 last:border-b-0">
                <span className="font-mono text-small text-muted-foreground">{String(step).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-h4">{t(`site.how.step${step}.title` as Key)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t(`site.how.step${step}.detail` as Key)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-border py-16 md:py-20">
        <div className="shell"><DeepCards t={t} locale={locale} /></div>
      </section>

      {agents.length > 0 && <WorksWith t={t} locale={locale} mods={agents} />}

      <section id="downloads" className="scroll-mt-16 border-b border-border py-16 md:py-20">
        <div className="shell">
          <SectionHeading kicker={t("site.downloads.kicker")} title={t("site.downloads.title")} note={t("site.downloads.note")} />
          <Downloads release={release} />
          <MoreOptions t={t} locale={locale} />
        </div>
      </section>

      <PrivacyBand t={t} locale={locale} />

      {/* O aviso das novidades fica fixo no pé da tela, por cima da página. */}
      {current && toast.length > 0 && <ReleaseToast items={toast} version={current.version} href={newsHref} />}
    </SitePage>
  );
}
