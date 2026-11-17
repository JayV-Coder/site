import type { Metadata } from "next";
import { EmptyText } from "@/components/atoms";
import { PageHeading } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import { doctorFetch, type Schemas } from "@/modules/doctor/api";
import { canRequireSso, ssoState } from "@/modules/doctor/sso";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../access";
import { DoctorShell } from "../DoctorShell";
import { RenewAccess } from "../members/RenewAccess";
import { Unavailable, UnavailablePage } from "../Unavailable";
import { ConnectionForm } from "./ConnectionForm";
import { Domains } from "./Domains";
import { Groups } from "./Groups";
import { ScimToken } from "./ScimToken";

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/sso">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.sso.title")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** O SSO corporativo (Tela 23, #48): metadados do IdP, domínios provados por DNS, "Exigir SSO",
 * grupos → Papéis e o token do SCIM. Só o Owner, com MFA. */
export default async function SsoPage({ params }: PageProps<"/[locale]/doctor/sso">) {
  const { locale } = await params;
  const [access, t] = await Promise.all([requireDoctor(locale, "/doctor/sso"), getT(locale)]);
  if (!access) return <UnavailablePage locale={locale} />;
  const response = await doctorFetch("/sso").catch(() => null);
  const forbidden = response?.status === 403;
  const settings = response?.ok ? ((await response.json().catch(() => null)) as Schemas["SsoSettings"] | null) : null;
  const state = ssoState(settings?.connection ?? null);

  return (
    <DoctorShell locale={locale} active={access.active} current="members">
      <PageHeading title={t("site.doctor.sso.title")} description={t("site.doctor.sso.intro")}>
        {settings && <Badge variant={state.variant}>{t(state.key)}</Badge>}
      </PageHeading>
      {forbidden && (
        <div className="grid justify-items-start gap-3">
          <EmptyText>{t("site.doctor.sso.ownerOnly")}</EmptyText>
          <RenewAccess />
        </div>
      )}
      {!forbidden && !settings && <Unavailable locale={locale} title={t("site.doctor.sso.unavailable")} retry="/doctor/sso" />}
      {settings && (
        <div className="grid max-w-2xl gap-6">
          {settings.connection?.status === "pending_platform" && <p role="status" className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm">{t("site.doctor.sso.pendingNote")}</p>}
          {settings.connection?.status === "error" && settings.connection.last_error && (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm break-words">{t("site.doctor.sso.errorNote", { error: settings.connection.last_error })}</p>
          )}
          {/* Remonta só quando a conexão nasce ou some: salvar não apaga o "salvo" da tela. */}
          <ConnectionForm key={settings.connection?.id ?? "new"} connection={settings.connection} canRequire={canRequireSso(settings.domains)} />
          {settings.connection && (
            <>
              <Domains domains={settings.domains} />
              <Groups groups={settings.groups} />
              <ScimToken enabled={settings.connection.scim_enabled} />
            </>
          )}
        </div>
      )}
    </DoctorShell>
  );
}
