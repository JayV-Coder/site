import Link from "next/link";
import { BrandMark } from "@/components/atoms";
import { Button } from "@/components/ui/button";
import { currentViewer } from "@/modules/auth/viewer";
import { getT } from "@/modules/i18n/server";
import { signOutAction } from "@/app/[locale]/actions";
import { MobileNav, type NavLink } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

/** A barra de cima, como o cabeçalho do app: a marca, os atalhos da página e
 * a conta. Do `lg` para cima os atalhos ficam na barra; abaixo, num menu.
 * Quem entrou vê a própria foto com o ponto de conectado, e o menu dela leva
 * ao painel (onde também mora a Administração, para o admin), à conta e a
 * sair. */
export async function SiteHeader({ locale }: { locale: string }) {
  const t = await getT(locale);
  const viewer = await currentViewer();
  const home = `/${locale}`;
  const link = "rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";
  const links: NavLink[] = [
    { href: `${home}#features`, label: t("site.nav.features") },
    { href: `${home}#downloads`, label: t("site.nav.downloads") },
    { href: `${home}/docs`, label: t("site.nav.docs") },
    { href: `${home}/releases`, label: t("site.nav.releases") },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="shell flex min-h-14 items-center justify-between gap-3">
        <Link href={home} aria-label={t("site.nav.home")} className="flex items-center gap-2.5 font-semibold">
          <BrandMark className="size-7 text-sm" />
          <span>JayV</span>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <nav aria-label={t("site.nav.label")} className="hidden items-center gap-1 lg:flex">
            {links.map((item) => <Link key={item.href} className={link} href={item.href}>{item.label}</Link>)}
          </nav>
          <ThemeToggle />
          {viewer ? (
            <UserMenu name={viewer.name} email={viewer.email} photo={viewer.photo} signOut={signOutAction.bind(null, locale)} />
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link href={`${home}/login`}>{t("site.nav.signIn")}</Link></Button>
              <Button asChild size="sm"><Link href={`${home}/register`}>{t("site.nav.signUp")}</Link></Button>
            </>
          )}
          <MobileNav links={links} extra={viewer ? undefined : [{ href: `${home}/login`, label: t("site.nav.signIn") }]} />
        </div>
      </div>
    </header>
  );
}
