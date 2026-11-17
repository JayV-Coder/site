import type { Metadata } from "next";
import { FileTextIcon } from "lucide-react";
import { SitePage } from "@/components/organisms/SitePage";
import { getT } from "@/modules/i18n/server";
import { SharedDownload } from "./SharedDownload";

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/shared">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  // Sem indexar e sem mandar o endereço a outros sites (o token está no `#`, mas por garantia).
  return { title: `${t("site.doctor.shared.title")} · ${t("site.doctor.name")}`, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

/** O link compartilhável do Relatório técnico: abre sem conta, vale 7 dias e pode ser revogado
 * por quem o criou. Cada download fica na Trilha de auditoria da Organização dona. */
export default async function SharedReportPage({ params }: PageProps<"/[locale]/doctor/shared">) {
  const { locale } = await params;
  const t = await getT(locale);
  return (
    <SitePage locale={locale}>
      <div className="shell max-w-xl py-8 md:py-12">
        <section aria-labelledby="doctor-shared-title" className="grid gap-4 rounded-lg border border-border bg-card px-5 py-6">
          <FileTextIcon aria-hidden="true" className="size-6 text-muted-foreground" />
          <h1 id="doctor-shared-title" className="text-xl font-semibold">{t("site.doctor.shared.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("site.doctor.shared.intro")}</p>
          <SharedDownload />
        </section>
      </div>
    </SitePage>
  );
}
