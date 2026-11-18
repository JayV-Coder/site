import type { Metadata } from "next";
import { PageHeading } from "@/components/molecules";
import { SitePage } from "@/components/organisms/SitePage";
import { getMe } from "@/modules/doctor/api";
import { organizationSections } from "@/modules/doctor/organizations";
import { getT } from "@/modules/i18n/server";
import { requireSession } from "../access";
import { Unavailable } from "../Unavailable";
import { AvailableOrganizations } from "./AvailableOrganizations";
import { NewOrganizationForm } from "./NewOrganizationForm";
import { OrgList } from "./OrgList";

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/organizations">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.org.choose")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Uma página só para as Organizações no Doctor (ADR-0025 do jayv-doctor): as que já usam o
 * Doctor (escolher a ativa), as do jayv-coder que o owner ativa ali mesmo, sem criar outra, e,
 * por último, criar uma nova. A moldura manda para cá quem ainda não tem Organização ativa. */
export default async function DoctorOrganizationsPage({ params }: PageProps<"/[locale]/doctor/organizations">) {
  const { locale } = await params;
  await requireSession(locale, "/doctor/organizations");
  const t = await getT(locale);
  const me = await getMe();
  const sections = me === null ? null : organizationSections(me);

  return (
    <SitePage locale={locale}>
      <div className="shell grid max-w-xl gap-8 py-8 md:py-12">
        <PageHeading eyebrow={t("site.doctor.name")} title={t("site.doctor.org.choose")} description={t("site.doctor.org.switchHint")} />
        {me === null || sections === null ? <Unavailable locale={locale} title={t("site.doctor.org.loadFailed")} /> : (
          <>
            {sections.doctor.length > 0 && (
              <section aria-labelledby="doctor-orgs-doctor" className="grid gap-3">
                <h2 id="doctor-orgs-doctor" className="text-sm font-semibold">{t("site.doctor.org.withDoctor")}</h2>
                <OrgList organizations={sections.doctor} activeId={me.active_tenant_id ?? null} />
              </section>
            )}
            {sections.activatable.length + sections.waiting.length > 0 && (
              <section aria-labelledby="doctor-orgs-available" className="grid gap-3">
                <div className="grid gap-1">
                  <h2 id="doctor-orgs-available" className="text-sm font-semibold">{t("site.doctor.org.available")}</h2>
                  <p className="text-sm text-muted-foreground">{t("site.doctor.org.availableHint")}</p>
                </div>
                <AvailableOrganizations activatable={sections.activatable} waiting={sections.waiting} />
              </section>
            )}
            <details open={sections.createOpen} className="rounded-lg border border-border px-4">
              <summary className="min-h-11 cursor-pointer content-center py-3 text-sm font-semibold">
                {sections.createOpen ? t("site.doctor.org.newTitle") : t("site.doctor.org.createOther")}
              </summary>
              <div className="grid gap-4 pb-4">
                <p className="text-sm text-muted-foreground">{t("site.doctor.org.newIntro")}</p>
                <NewOrganizationForm />
              </div>
            </details>
          </>
        )}
      </div>
    </SitePage>
  );
}
