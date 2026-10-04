import type { ReactNode } from "react";
import { getT } from "@/modules/i18n/server";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** A moldura de toda página do site: a barra de cima, o conteúdo e o rodapé. */
export async function SitePage({ locale, children }: { locale: string; children: ReactNode }) {
  const t = await getT(locale);
  return (
    <>
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-foreground">{t("site.skip")}</a>
      <SiteHeader locale={locale} />
      <main id="content" className="flex-1">{children}</main>
      <SiteFooter locale={locale} />
    </>
  );
}
