import Link from "next/link";
import { SitePage } from "@/components/organisms/SitePage";
import { Button } from "@/components/ui/button";
import { getT } from "@/modules/i18n/server";

/** A API do Doctor não respondeu: sem a resposta, não dá para dizer que não há dados. */
export async function Unavailable({ locale, title, retry = "/doctor" }: { locale: string; title?: string; retry?: string }) {
  const t = await getT(locale);
  return (
    <div role="alert" className="grid justify-items-start gap-3 rounded-lg border border-border bg-card px-5 py-6">
      <h2 className="text-base font-semibold">{title ?? t("site.doctor.unavailable.title")}</h2>
      <p className="max-w-[62ch] text-sm leading-relaxed text-muted-foreground">{t("site.doctor.unavailable.body")}</p>
      <Button asChild variant="outline"><Link href={`/${locale}${retry}`} prefetch={false}>{t("site.doctor.reload")}</Link></Button>
    </div>
  );
}

/** A página inteira quando a API não respondeu: sem ela não há Organização ativa para a moldura. */
export async function UnavailablePage({ locale }: { locale: string }) {
  return (
    <SitePage locale={locale}>
      <div className="shell max-w-xl py-8 md:py-12"><Unavailable locale={locale} /></div>
    </SitePage>
  );
}
