import type { Metadata } from "next";
import { EmptyText } from "@/components/atoms";
import { BackLink, PageHeading } from "@/components/molecules";
import { isManager } from "@/modules/doctor/labels";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../access";
import { DoctorShell } from "../DoctorShell";
import { UnavailablePage } from "../Unavailable";
import { SubjectForm } from "./SubjectForm";

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/subject">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.subject.title")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** A pedido do controlador (LGPD): Owner ou Admin com MFA localiza e apaga os Eventos de um titular
 * pela Referência de negócio, que vira HMAC com a chave da Organização. */
export default async function SubjectPage({ params }: PageProps<"/[locale]/doctor/subject">) {
  const { locale } = await params;
  const access = await requireDoctor(locale, "/doctor/subject");
  const t = await getT(locale);
  if (!access) return <UnavailablePage locale={locale} />;

  return (
    <DoctorShell locale={locale} active={access.active} current="privacy">
      <BackLink href={`/${locale}/doctor/privacy`}>{t("site.doctor.nav.privacy")}</BackLink>
      <PageHeading title={t("site.doctor.subject.title")} description={t("site.doctor.subject.intro")} />
      {isManager(access.active.role) ? <SubjectForm /> : <EmptyText>{t("site.doctor.members.managersOnly")}</EmptyText>}
    </DoctorShell>
  );
}
