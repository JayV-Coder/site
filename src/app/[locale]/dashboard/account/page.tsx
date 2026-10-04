import type { Metadata } from "next";
import { LogOutIcon } from "lucide-react";
import { LoadingNote } from "@/components/atoms";
import { cardName, ProfileCard } from "@/components/organisms/ProfileCard";
import { SubmitButton } from "@/components/molecules";
import { getT } from "@/modules/i18n/server";
import { signOutAction } from "../../actions";
import { requireAccess } from "../access";
import { DashboardShell } from "../DashboardShell";
import { AccountBoard, type AccountTab } from "./AccountBoard";
import { loadAccount } from "./data";
import type { LinkResult } from "./LinkedSection";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/account">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.account.title")} · JayV`, robots: { index: false } };
}

const TABS: AccountTab[] = ["data", "security", "linked"];
const RESULTS: LinkResult[] = ["linked", "taken", "failed"];

/** A conta de quem entrou — o cartão do Perfil do app e, embaixo, dados
 * pessoais, segurança e contas vinculadas. Vale para qualquer conta, seja
 * qual for o plano ou o papel. */
export default async function AccountPage({ params, searchParams }: PageProps<"/[locale]/dashboard/account">) {
  const { locale } = await params;
  const query = await searchParams;
  const access = await requireAccess(locale, "/dashboard/account");
  const t = await getT(locale);
  const account = await loadAccount();
  const tab = TABS.find((known) => known === query.tab) ?? "data";
  const kind = RESULTS.find((known) => known === query.result);
  const result = kind ? { kind, provider: typeof query.provider === "string" ? query.provider : null } : null;

  return (
    <DashboardShell locale={locale} access={access} current="account">
      {account ? (
        <>
          <ProfileCard locale={locale}
            data={{
              name: cardName(account.profile?.displayName, account.card.providerName, account.email),
              username: account.profile?.username ?? null,
              email: account.email,
              avatarUrl: account.card.avatarUrl,
              lastProvider: account.card.lastProvider,
              hasPassword: account.hasPassword,
              providers: account.providers,
              expertise: account.card.expertise,
              createdAt: account.card.createdAt,
              lastSignInAt: account.card.lastSignInAt,
            }}
            action={(
              <form action={signOutAction.bind(null, locale)}>
                <SubmitButton variant="outline" className="hover:border-destructive/60 hover:text-destructive">
                  <LogOutIcon />
                  {t("auth.signOut")}
                </SubmitButton>
              </form>
            )} />
          <AccountBoard account={account} tab={tab} result={result} />
        </>
      ) : <LoadingNote>{t("settings.loading")}</LoadingNote>}
    </DashboardShell>
  );
}
