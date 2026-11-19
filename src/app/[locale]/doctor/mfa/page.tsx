import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlertIcon } from "lucide-react";
import { PageHeading } from "@/components/molecules";
import { SitePage } from "@/components/organisms/SitePage";
import { Button } from "@/components/ui/button";
import { getT } from "@/modules/i18n/server";
import { requireSession } from "../access";

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/mfa">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.mfaGate.title")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** A Organização ativa exige a verificação em duas etapas e a sessão não a tem (#49 do
 * jayv-doctor): configurar o app autenticador, ou trocar de Organização. */
export default async function MfaGatePage({ params }: PageProps<"/[locale]/doctor/mfa">) {
  const { locale } = await params;
  await requireSession(locale, "/doctor/mfa");
  const t = await getT(locale);
  return (
    <SitePage locale={locale}>
      <div className="shell grid max-w-xl gap-4 py-8 md:py-12">
        <ShieldAlertIcon aria-hidden className="size-8 text-warning" />
        <PageHeading eyebrow={t("site.doctor.name")} title={t("site.doctor.mfaGate.title")} description={t("site.doctor.mfaGate.intro")} />
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link href={`/${locale}/dashboard/account`}>{t("site.doctor.sso.setUpMfa")}</Link></Button>
          <Button asChild variant="outline"><Link href={`/${locale}/doctor/organizations`}>{t("site.doctor.mfaGate.switch")}</Link></Button>
        </div>
      </div>
    </SitePage>
  );
}
