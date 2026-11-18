import type { Metadata } from "next";
import { PageHeading } from "@/components/molecules";
import { doctorList, type Schemas } from "@/modules/doctor/api";
import { canManage } from "@/modules/doctor/labels";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../../access";
import { DoctorShell } from "../../DoctorShell";
import { Unavailable, UnavailablePage } from "../../Unavailable";
import { SanitizationEditor } from "./SanitizationEditor";

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/privacy/sanitization">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.sanitization.title")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** As regras de Sanitização da Organização (#13): padrões próprios (matrícula, nº de contrato)
 * somados aos detectores da plataforma, e o que fazer com IPs. Todos veem; Owner e Admin com
 * MFA mudam. */
export default async function SanitizationPage({ params }: PageProps<"/[locale]/doctor/privacy/sanitization">) {
  const { locale } = await params;
  const [access, t] = await Promise.all([requireDoctor(locale, "/doctor/privacy/sanitization"), getT(locale)]);
  if (!access) return <UnavailablePage locale={locale} />;
  const rules = await doctorList<Schemas["SanitizationRules"]>("/privacy/sanitization");
  const editable = canManage(access.me);

  return (
    <DoctorShell locale={locale} active={access.active} current="privacy">
      <PageHeading title={t("site.doctor.sanitization.title")} description={t("site.doctor.sanitization.intro")} />
      <div className="grid gap-5">
        <p className="rounded-md border border-border bg-secondary px-3 py-2 text-sm">{t("site.doctor.sanitization.builtIn")}</p>
        {!editable && <p className="text-sm text-muted-foreground">{t("site.doctor.sanitization.managersOnly")}</p>}
        {rules ? <SanitizationEditor rules={rules} editable={editable} /> : <Unavailable locale={locale} title={t("site.doctor.sanitization.unavailable")} retry="/doctor/privacy/sanitization" />}
      </div>
    </DoctorShell>
  );
}
