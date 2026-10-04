import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "../globals.css";
import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { Providers } from "@/components/Providers";
import { FALLBACK } from "@/modules/i18n/render";
import { getLocales, getMessages, getT } from "@/modules/i18n/server";
import { THEME_BOOT } from "@/modules/theme/boot";

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  const locales = await getLocales();
  return {
    title: t("site.meta.title"),
    description: t("site.meta.description"),
    openGraph: { title: t("site.meta.title"), description: t("site.meta.description"), siteName: "JayV", type: "website" },
    alternates: { languages: Object.fromEntries(locales.map((option) => [option.id, `/${option.id}`])) },
  };
}

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f4f4f0" }, { media: "(prefers-color-scheme: dark)", color: "#111210" }],
};

/** A raiz de toda página: o idioma vem do endereço (`/pt-BR/...`) e as
 * traduções dele são lidas aqui, no servidor, uma vez por página. */
export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  const locales = await getLocales();
  const option = locales.find((known) => known.id === locale);
  // Um idioma que a tabela não tem vai para o inglês. Sem a lista (Supabase
  // fora do ar) a página abre no idioma pedido, com o texto em inglês.
  if (!option && locales.length > 1) redirect(`/${FALLBACK}`);
  const messages = await getMessages(locale);

  return (
    <html lang={locale} dir={option?.rtl ? "rtl" : "ltr"} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <Providers locale={locale} locales={locales} messages={messages}>{children}</Providers>
      </body>
    </html>
  );
}
