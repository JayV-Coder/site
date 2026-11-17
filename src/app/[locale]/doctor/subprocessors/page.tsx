import type { Metadata } from "next";
import { PageHeading } from "@/components/molecules";
import { doctorList, type Schemas } from "@/modules/doctor/api";
import { aiProfileKey, dpaKey, subprocessors } from "@/modules/doctor/privacy";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../access";
import { DoctorShell } from "../DoctorShell";
import { Unavailable, UnavailablePage } from "../Unavailable";

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/subprocessors">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.nav.subprocessors")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Quem trata os dados da Organização em nome do Doctor, com a região (PRD §8). A lista e o DPA
 * seguem o perfil de IA (ADR-0018); com o envio ao LLM desligado, o provedor de IA não recebe nada. */
export default async function SubprocessorsPage({ params }: PageProps<"/[locale]/doctor/subprocessors">) {
  const { locale } = await params;
  const access = await requireDoctor(locale, "/doctor/subprocessors");
  const t = await getT(locale);
  if (!access) return <UnavailablePage locale={locale} />;
  const privacy = await doctorList<Schemas["PrivacySettings"]>("/privacy");
  const profile = privacy?.ai_profile ?? "standard";

  return (
    <DoctorShell locale={locale} active={access.active} current="subprocessors">
      <PageHeading title={t("site.doctor.nav.subprocessors")} description={t("site.doctor.subprocessors.intro")} />
      {!privacy ? <Unavailable locale={locale} title={t("site.doctor.subprocessors.unavailable")} retry="/doctor/subprocessors" /> : (
        <div className="grid gap-4">
          <ul className="grid gap-3 @3xl:grid-cols-2" aria-label={t("site.doctor.nav.subprocessors")}>
            {subprocessors(profile).map((item) => (
              <li key={item.name} className="grid gap-1 rounded-lg border border-border bg-card px-4 py-4">
                <span className="font-medium">{item.name}</span>
                <span className="text-sm text-muted-foreground">{t(item.purpose)}</span>
                <span className="text-sm">{t(item.region)}</span>
              </li>
            ))}
          </ul>
          <p role="note" className="text-sm"><strong>{t("site.doctor.subprocessors.profile", { profile: t(aiProfileKey(profile)) })}</strong> {t(dpaKey(profile))}</p>
          {!privacy.llm_enabled && <p className="text-sm text-muted-foreground">{t("site.doctor.subprocessors.llmOff")}</p>}
        </div>
      )}
    </DoctorShell>
  );
}
