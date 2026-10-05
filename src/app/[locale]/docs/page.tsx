import type { Metadata } from "next";
import Link from "next/link";
import { ScrollTextIcon } from "lucide-react";
import { EmptyText } from "@/components/atoms";
import { PageHeading } from "@/components/molecules";
import { ManualBrowser, type ManualView } from "@/components/organisms/docs/ManualBrowser";
import { SitePage } from "@/components/organisms/SitePage";
import { getContentTexts, getT } from "@/modules/i18n/server";
import { localized } from "@/modules/releases/content";
import { manual } from "@/modules/releases/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/docs">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.docs.title")} · JayV`, description: t("site.docs.description") };
}

/** A documentação do app: cada funcionalidade e cada comando, publicados pelo
 * app no repositório de releases e lidos pela função `releases` do Supabase.
 * O texto chega em inglês e troca pelo idioma da página quando a chave
 * `docs.*` já foi traduzida. */
export default async function DocsPage({ params }: PageProps<"/[locale]/docs">) {
  const { locale } = await params;
  const [t, data, texts] = await Promise.all([getT(locale), manual(), getContentTexts(locale, "docs")]);
  const view: ManualView | null = data && data.features.length > 0 ? {
    version: data.version,
    features: data.features.map((feature) => ({
      id: feature.id,
      category: feature.category,
      since: feature.since,
      plan: !!feature.plan,
      commands: feature.commands,
      title: localized(texts, `docs.${feature.id}.title`, feature.title),
      summary: localized(texts, `docs.${feature.id}.summary`, feature.summary),
      usage: localized(texts, `docs.${feature.id}.usage`, feature.usage),
    })),
    // O que se digita só muda nos nomes entre `<>` (`jayv run <pedido>`), que
    // também vêm do i18n (`docs.command.<id>.usage`).
    commands: data.commands.map((command) => ({
      ...command,
      usage: localized(texts, `docs.command.${command.id}.usage`, command.usage),
      detail: localized(texts, `docs.command.${command.id}`, command.detail),
    })),
  } : null;

  return (
    <SitePage locale={locale}>
      <div className="shell py-8 md:py-12">
        <PageHeading eyebrow={t("site.docs.eyebrow")} title={t("site.docs.title")} description={t("site.docs.description")}>
          <Link href={`/${locale}/releases`} className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3.5 text-sm font-medium transition-colors hover:bg-secondary">
            <ScrollTextIcon className="size-4" />{t("site.nav.releases")}
          </Link>
        </PageHeading>
        {view ? <ManualBrowser manual={view} /> : <EmptyText>{t("site.docs.empty")}</EmptyText>}
      </div>
    </SitePage>
  );
}
