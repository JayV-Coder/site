import type { Metadata } from "next";
import Link from "next/link";
import { EmptyText } from "@/components/atoms";
import { PageHeading } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { doctorFetch, type Schemas } from "@/modules/doctor/api";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../access";
import { DoctorShell } from "../DoctorShell";
import { RenewAccess } from "../members/RenewAccess";
import { Unavailable, UnavailablePage } from "../Unavailable";
import { PoliciesForm } from "./PoliciesForm";

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/policies">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.policies.title")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Políticas da Organização (Tela 23, #49 do jayv-doctor): o MFA obrigatório para todos os
 * Papéis. Só Owner e Admin, com MFA. */
export default async function PoliciesPage({ params }: PageProps<"/[locale]/doctor/policies">) {
  const { locale } = await params;
  const [access, t] = await Promise.all([requireDoctor(locale, "/doctor/policies"), getT(locale)]);
  if (!access) return <UnavailablePage locale={locale} />;
  const response = await doctorFetch("/policies").catch(() => null);
  const denied = response?.status === 403 ? (((await response.json().catch(() => ({}))) as { code?: string }).code ?? "forbidden") : null;
  const policies = response?.ok ? ((await response.json().catch(() => null)) as Schemas["Policies"] | null) : null;

  return (
    <DoctorShell locale={locale} active={access.active} current="members">
      <PageHeading title={t("site.doctor.policies.title")} description={t("site.doctor.policies.intro")} />
      {denied !== null && (
        <div className="grid justify-items-start gap-3">
          <EmptyText>{t(denied === "mfa_required" ? "site.doctor.error.mfaRequired" : "site.doctor.policies.managersOnly")}</EmptyText>
          {denied === "mfa_required"
            ? <Button asChild variant="outline"><Link href={`/${locale}/dashboard/account`}>{t("site.doctor.sso.setUpMfa")}</Link></Button>
            : <RenewAccess />}
        </div>
      )}
      {denied === null && !policies && <Unavailable locale={locale} title={t("site.doctor.policies.unavailable")} retry="/doctor/policies" />}
      {policies && <PoliciesForm policies={policies} />}
    </DoctorShell>
  );
}
