import Link from "next/link";
import { BrandMark } from "@/components/atoms";
import { getT } from "@/modules/i18n/server";
import { latestRelease } from "@/modules/releases/server";

/** O rodapé de toda página: a marca com a frase do topo, as colunas de links
 * (produto, ajuda e conta) e, embaixo, a versão publicada. O idioma e o tema
 * ficam no cabeçalho. */
export async function SiteFooter({ locale }: { locale: string }) {
  const t = await getT(locale);
  const release = await latestRelease();
  const home = `/${locale}`;
  const columns = [
    { title: t("site.footer.product"), links: [
      { href: `${home}#features`, label: t("site.nav.features") },
      { href: `${home}/mods`, label: t("site.nav.mods") },
      { href: `${home}/plans`, label: t("site.nav.plans") },
      { href: `${home}#downloads`, label: t("site.nav.downloads") },
    ] },
    { title: t("site.footer.help"), links: [
      { href: `${home}/docs`, label: t("site.nav.docs") },
      { href: `${home}/releases`, label: t("site.nav.releases") },
      { href: `${home}/docs#tutorials`, label: t("site.footer.tutorials") },
    ] },
    { title: t("site.footer.account"), links: [
      { href: `${home}/login`, label: t("site.nav.signIn") },
      { href: `${home}/register`, label: t("site.nav.signUp") },
      { href: `${home}/dashboard`, label: t("site.dashboard.title") },
    ] },
  ];
  return (
    <footer className="border-t border-border pt-12 pb-8 text-xs text-muted-foreground">
      <div className="shell">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <div className="col-span-2 grid content-start gap-2 sm:col-span-3 lg:col-span-1">
            <Link href={home} aria-label={t("site.nav.home")} className="flex w-fit items-center gap-2.5 text-sm font-semibold text-foreground">
              <BrandMark className="size-7 text-sm" /><span>JayV</span>
            </Link>
            <p>{t("site.hero.title")} {t("site.hero.highlight")}</p>
          </div>
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title} className="grid content-start gap-2">
              <p className="text-sm font-semibold text-foreground">{column.title}</p>
              {column.links.map((link) => <Link key={link.href} href={link.href} className="w-fit transition-colors hover:text-foreground">{link.label}</Link>)}
            </nav>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-6">
          <span>{t("site.footer.rights", { year: new Date().getFullYear() })}</span>
          {release && <span className="font-mono">v{release.version}</span>}
        </div>
      </div>
    </footer>
  );
}
