import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/organisms/auth/LoginForm";
import { SitePage } from "@/components/organisms/SitePage";
import { safeNext } from "@/modules/auth/next";
import { getT } from "@/modules/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/login">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("auth.signIn")} · JayV`, robots: { index: false } };
}

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  const query = await searchParams;
  const next = safeNext(typeof query.next === "string" ? query.next : null, `/${locale}`);
  const session = await auth();
  if (session?.accessToken) redirect(next);
  const t = await getT(locale);
  // A sessão que o Supabase não renovou (senha trocada, sessão revogada).
  const notice = session?.error === "refresh"
    ? t("site.session.failed")
    : next === `/${locale}/dashboard/admin` ? t("site.admin.signIn")
      : next.startsWith(`/${locale}/dashboard`) ? t("site.dashboard.signIn") : undefined;
  return <SitePage locale={locale}><LoginForm next={next} notice={notice} /></SitePage>;
}
