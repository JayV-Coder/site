import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RegisterForm } from "@/components/organisms/auth/RegisterForm";
import { SitePage } from "@/components/organisms/SitePage";
import { safeNext } from "@/modules/auth/next";
import { getT } from "@/modules/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/register">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.register.title")} · JayV` };
}

/** O cadastro, que antes era um modo da tela de login do app. */
export default async function RegisterPage({ params, searchParams }: PageProps<"/[locale]/register">) {
  const { locale } = await params;
  const query = await searchParams;
  const next = safeNext(typeof query.next === "string" ? query.next : null, `/${locale}`);
  const session = await auth();
  if (session?.accessToken) redirect(next);
  return <SitePage locale={locale}><RegisterForm next={next} /></SitePage>;
}
