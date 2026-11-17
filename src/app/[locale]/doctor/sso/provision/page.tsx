import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SitePage } from "@/components/organisms/SitePage";
import { provisionNext, provisionPath } from "@/modules/doctor/ssoLogin";
import { getT } from "@/modules/i18n/server";
import { Provision } from "./Provision";

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/sso/provision">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.ssoLogin.title")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** A volta do login pelo IdP (ADR-0021 do jayv-doctor): cria o Vínculo pelo grupo e entra. */
export default async function ProvisionPage({ params, searchParams }: PageProps<"/[locale]/doctor/sso/provision">) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const next = provisionNext(locale, typeof query.next === "string" ? query.next : null);
  const session = await auth();
  // Sem sessão (cookie perdido na volta do IdP), entra de novo e volta para cá, com o destino.
  if (!session?.accessToken) redirect(`/${locale}/login?next=${encodeURIComponent(provisionPath(locale, next))}`);
  const t = await getT(locale);
  return (
    <SitePage locale={locale}>
      <div className="shell max-w-xl py-8 md:py-12">
        <section aria-labelledby="doctor-sso-provision" className="grid gap-4 rounded-lg border border-border bg-card px-5 py-6">
          <h1 id="doctor-sso-provision" className="text-xl font-semibold">{t("site.doctor.ssoLogin.title")}</h1>
          <Provision locale={locale} next={next} />
        </section>
      </div>
    </SitePage>
  );
}
