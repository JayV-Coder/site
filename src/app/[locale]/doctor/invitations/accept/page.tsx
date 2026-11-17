import type { Metadata } from "next";
import { auth } from "@/auth";
import { SitePage } from "@/components/organisms/SitePage";
import { getT } from "@/modules/i18n/server";
import { AcceptInvitation } from "./AcceptInvitation";

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/invitations/accept">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.invite.title")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** O link do e-mail traz o token depois do `#`, que o servidor não recebe: a tela o lê no
 * navegador, guarda para o caso de o login passar por outra aba e o manda só à API. */
export default async function AcceptInvitationPage({ params }: PageProps<"/[locale]/doctor/invitations/accept">) {
  const { locale } = await params;
  const session = await auth();
  return (
    <SitePage locale={locale}>
      <div className="shell max-w-xl py-8 md:py-12">
        <AcceptInvitation locale={locale} signedIn={Boolean(session?.accessToken)} />
      </div>
    </SitePage>
  );
}
