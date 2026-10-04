import { LanguageSelect, ThemeSelect } from "@/components/molecules";
import { getT } from "@/modules/i18n/server";
import { latestRelease } from "@/modules/releases/server";

/** O rodapé: a versão publicada, o idioma e o tema. */
export async function SiteFooter({ locale }: { locale: string }) {
  const t = await getT(locale);
  const release = await latestRelease();
  return (
    <footer className="border-t border-border py-8 text-xs text-muted-foreground">
      <div className="shell flex flex-wrap items-center justify-between gap-4">
        <span className="flex items-center gap-3">
          <span>{t("site.footer.rights", { year: new Date().getFullYear() })}</span>
          {release && <span className="font-mono">v{release.version}</span>}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-52"><LanguageSelect /></div>
          <ThemeSelect />
        </div>
      </div>
    </footer>
  );
}
