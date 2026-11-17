import type { Metadata } from "next";
import { PageHeading } from "@/components/molecules";
import { EmptyText } from "@/components/atoms";
import { doctorList, type Schemas } from "@/modules/doctor/api";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../access";
import { DoctorShell } from "../DoctorShell";
import { UnavailablePage } from "../Unavailable";
import { MembersPanel } from "./MembersPanel";
import { RenewAccess } from "./RenewAccess";

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/members">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.nav.members")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Membros e Convites da Organização ativa: só Owner e Admin, com a verificação em duas etapas. */
export default async function MembersPage({ params }: PageProps<"/[locale]/doctor/members">) {
  const { locale } = await params;
  const access = await requireDoctor(locale, "/doctor/members");
  const t = await getT(locale);
  if (!access) return <UnavailablePage locale={locale} />;
  const [members, invitations] = await Promise.all([
    doctorList<Schemas["Member"][]>("/memberships"),
    doctorList<Schemas["Invitation"][]>("/invitations"),
  ]);
  const role = access.active.role;

  return (
    <DoctorShell locale={locale} active={access.active} current="members">
      <PageHeading title={t("site.doctor.nav.members")} description={t("site.doctor.members.intro")} />
      {members && invitations && role ? <MembersPanel members={members} invitations={invitations} viewerRole={role} /> : (
        <div className="grid justify-items-start gap-3">
          <EmptyText>{t("site.doctor.members.managersOnly")}</EmptyText>
          <RenewAccess />
        </div>
      )}
    </DoctorShell>
  );
}
