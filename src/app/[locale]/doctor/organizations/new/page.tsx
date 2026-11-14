import type { Metadata } from "next";
import { PageHeading } from "@/components/molecules";
import { SitePage } from "@/components/organisms/SitePage";
import { getMe } from "@/modules/doctor/api";
import { getT } from "@/modules/i18n/server";
import { requireSession } from "../../access";
import { NewOrganizationForm } from "./NewOrganizationForm";

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/organizations/new">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.org.newTitle")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** O começo no Doctor: a moldura manda para cá quem ainda não tem Organização. */
export default async function NewDoctorOrganizationPage({ params }: PageProps<"/[locale]/doctor/organizations/new">) {
  const { locale } = await params;
  await requireSession(locale, "/doctor/organizations/new");
  const t = await getT(locale);
  const me = await getMe();

  return (
    <SitePage locale={locale}>
      <div className="shell max-w-xl py-8 md:py-12">
        <PageHeading eyebrow={t("site.doctor.name")} title={t("site.doctor.org.newTitle")} description={t("site.doctor.org.newIntro")} />
        <NewOrganizationForm canGoBack={(me?.organizations.length ?? 0) > 0} />
      </div>
    </SitePage>
  );
}
