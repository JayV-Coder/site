import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/molecules";
import { SitePage } from "@/components/organisms/SitePage";
import { getMe } from "@/modules/doctor/api";
import { getT } from "@/modules/i18n/server";
import { requireSession } from "../access";
import { Unavailable } from "../Unavailable";
import { OrgList } from "./OrgList";

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/organizations">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.org.choose")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Quem tem Vínculo mas nenhuma Organização ativa escolhe aqui; também é para onde o
 * seletor da moldura leva. */
export default async function DoctorOrganizationsPage({ params }: PageProps<"/[locale]/doctor/organizations">) {
  const { locale } = await params;
  await requireSession(locale, "/doctor/organizations");
  const t = await getT(locale);
  const me = await getMe();
  if (me?.organizations.length === 0) redirect(`/${locale}/doctor/organizations/new`);

  return (
    <SitePage locale={locale}>
      <div className="shell max-w-xl py-8 md:py-12">
        <PageHeading eyebrow={t("site.doctor.name")} title={t("site.doctor.org.choose")} description={t("site.doctor.org.switchHint")} />
        {me === null
          ? <Unavailable locale={locale} title={t("site.doctor.org.loadFailed")} />
          : <OrgList organizations={me.organizations} activeId={me.active_tenant_id ?? null} />}
      </div>
    </SitePage>
  );
}
