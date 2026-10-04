import Link from "next/link";
import { LayoutDashboardIcon } from "lucide-react";
import { auth } from "@/auth";
import { BrandMark } from "@/components/atoms";
import { SubmitButton } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { getT } from "@/modules/i18n/server";
import { RELEASES_URL } from "@/modules/releases/config";
import { signOutAction } from "@/app/[locale]/actions";
import { ThemeToggle } from "./ThemeToggle";

/** A barra de cima, como o cabeçalho do app: a marca, os atalhos da página e
 * a conta. Quem entrou ganha o botão do painel (onde também mora a
 * Administração, para o admin). No celular os atalhos da página somem e fica
 * o essencial. */
export async function SiteHeader({ locale }: { locale: string }) {
  const t = await getT(locale);
  const session = await auth();
  const signedIn = !!session?.accessToken;
  const home = `/${locale}`;
  const link = "rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="shell flex min-h-14 items-center justify-between gap-4">
        <Link href={home} aria-label={t("site.nav.home")} className="flex items-center gap-2.5 font-semibold">
          <BrandMark className="size-7 text-sm" />
          <span>JayV</span>
        </Link>
        <nav aria-label={t("site.nav.label")} className="flex items-center gap-1">
          <div className="hidden items-center gap-1 md:flex">
            <Link className={link} href={`${home}#features`}>{t("site.nav.features")}</Link>
            <Link className={link} href={`${home}#downloads`}>{t("site.nav.downloads")}</Link>
            <Link className={link} href={`${home}#how`}>{t("site.nav.how")}</Link>
            <a className={link} href={RELEASES_URL} target="_blank" rel="noreferrer">{t("site.nav.releases")}</a>
          </div>
          <ThemeToggle />
          {signedIn ? (
            <form action={signOutAction.bind(null, locale)} className="flex items-center gap-2">
              <span className="hidden max-w-48 truncate text-xs text-muted-foreground lg:inline" title={session?.user?.email ?? undefined}>
                {t("site.nav.account", { email: session?.user?.email ?? "" })}
              </span>
              <Button asChild size="sm">
                <Link href={`${home}/dashboard`} aria-label={t("site.nav.dashboard")}><LayoutDashboardIcon /><span className="hidden sm:inline">{t("site.nav.dashboard")}</span></Link>
              </Button>
              <SubmitButton variant="outline" size="sm">{t("auth.signOut")}</SubmitButton>
            </form>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link href={`${home}/login`}>{t("site.nav.signIn")}</Link></Button>
              <Button asChild size="sm"><Link href={`${home}/register`}>{t("site.nav.signUp")}</Link></Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
