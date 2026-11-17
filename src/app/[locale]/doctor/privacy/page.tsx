import type { Metadata } from "next";
import { PageHeading } from "@/components/molecules";
import { doctorList, type Schemas } from "@/modules/doctor/api";
import { isManager } from "@/modules/doctor/labels";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../access";
import { DoctorShell } from "../DoctorShell";
import { Unavailable, UnavailablePage } from "../Unavailable";
import { PrivacyPanel } from "./PrivacyPanel";

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/privacy">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.nav.privacy")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Privacidade da Organização: retenção por classe de dados, envio ao LLM, perfil de IA e exclusão
 * total. Todos veem; só Owner e Admin alteram, e só o Owner troca o perfil e pede a exclusão. */
export default async function PrivacyPage({ params }: PageProps<"/[locale]/doctor/privacy">) {
  const { locale } = await params;
  const access = await requireDoctor(locale, "/doctor/privacy");
  const t = await getT(locale);
  if (!access) return <UnavailablePage locale={locale} />;
  const settings = await doctorList<Schemas["PrivacySettings"]>("/privacy");
  const role = access.active.role;

  return (
    <DoctorShell locale={locale} active={access.active} current="privacy">
      <PageHeading title={t("site.doctor.nav.privacy")} description={t("site.doctor.privacy.intro")} />
      {!settings ? <Unavailable locale={locale} title={t("site.doctor.privacy.unavailable")} retry="/doctor/privacy" /> : (
        <PrivacyPanel locale={locale} settings={settings} manager={isManager(role)} owner={role === "owner"} slug={access.active.slug} />
      )}
    </DoctorShell>
  );
}
