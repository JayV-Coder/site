import type { Metadata } from "next";
import { EmptyText } from "@/components/atoms";
import { PageHeading } from "@/components/molecules";
import { ModCatalogBrowser } from "@/components/organisms/mods/ModCatalogBrowser";
import { SitePage } from "@/components/organisms/SitePage";
import { getT } from "@/modules/i18n/server";
import { cardsOf } from "@/modules/mods/pages";
import { modCatalog, modPages } from "@/modules/mods/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/mods">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.modPages.title")} · JayV`, description: t("site.modPages.description") };
}

/** O catálogo público dos mods: todos os mods do repositório de mods, com a
 * busca e as categorias, cada um com a sua página. Os textos de cada mod vêm
 * do próprio repositório, nos dez idiomas; o resto, do i18n do site. */
export default async function ModsPage({ params }: PageProps<"/[locale]/mods">) {
  const { locale } = await params;
  const [t, catalog, pages] = await Promise.all([getT(locale), modCatalog(), modPages()]);
  const cards = catalog ? cardsOf(catalog, pages, locale) : [];

  return (
    <SitePage locale={locale}>
      <div className="shell py-8 md:py-12">
        <PageHeading eyebrow={t("site.modPages.eyebrow")} title={t("site.modPages.title")} description={t("site.modPages.description")} />
        {cards.length > 0 ? <ModCatalogBrowser cards={cards} locale={locale} /> : <EmptyText>{t("site.modPages.empty")}</EmptyText>}
      </div>
    </SitePage>
  );
}
