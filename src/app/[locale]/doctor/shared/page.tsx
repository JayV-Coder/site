import type { Metadata } from "next";
import { SitePage } from "@/components/organisms/SitePage";
import { getT } from "@/modules/i18n/server";
import { SharedDownload } from "./SharedDownload";

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/shared">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.shared.title")} · ${t("site.doctor.name")}`, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

/** Link compartilhável do Relatório técnico (ADR-0014): abre sem conta. O token vem depois do `#`,
 * que não chega ao servidor; a tela o envia no corpo do pedido. */
export default async function SharedReportPage({ params }: PageProps<"/[locale]/doctor/shared">) {
  const { locale } = await params;
  const t = await getT(locale);
  return (
    <SitePage locale={locale}>
      <div className="shell max-w-xl py-8 md:py-12">
        <section aria-labelledby="doctor-shared-title" className="grid gap-4">
          <h1 id="doctor-shared-title" className="text-xl font-semibold">{t("site.doctor.shared.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("site.doctor.shared.intro")}</p>
          <SharedDownload />
        </section>
      </div>
    </SitePage>
  );
}
