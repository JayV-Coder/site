import { Eyebrow } from "@/components/atoms";
import { Downloads, HeroDownload } from "@/components/organisms/home/Downloads";
import { Trace } from "@/components/organisms/home/Trace";
import { SitePage } from "@/components/organisms/SitePage";
import { Badge } from "@/components/ui/badge";
import type { Key } from "@/modules/i18n";
import { getT } from "@/modules/i18n/server";
import { RELEASES_REPOSITORY, RELEASES_URL } from "@/modules/releases/config";
import { latestRelease } from "@/modules/releases/server";

const AGENTS = ["Codex", "Claude Code", "GitHub Copilot", "Cursor Agent"];
const FEATURES = ["agents", "routing", "trace", "account"] as const;
const STEPS = [1, 2, 3, 4] as const;

/** O título de uma seção: a linha pequena, o título depois do `❯` e, ao lado,
 * a explicação. */
function SectionHeading({ kicker, title, note }: { kicker: string; title: string; note?: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <Eyebrow>{kicker}</Eyebrow>
        <h2 className="flex gap-[1ch] text-h1"><span aria-hidden="true" className="text-go">❯</span><span>{title}</span></h2>
      </div>
      {note && <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{note}</p>}
    </div>
  );
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const t = await getT(locale);
  const release = await latestRelease();

  return (
    <SitePage locale={locale}>
      <section className="grid-bg border-b border-border">
        <div className="shell grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="min-w-0">
            <Badge variant="outline" mono className="mb-6 gap-2 bg-card px-2 py-1"><span aria-hidden="true" className="size-1.5 rounded-full bg-go" />{t("site.hero.eyebrow")}</Badge>
            <h1 className="text-[clamp(2rem,6vw,3.5rem)] leading-[1.05] font-semibold tracking-tight">
              {t("site.hero.title")}<br /><span className="highlight">{t("site.hero.highlight")}</span>
            </h1>
            <p className="mt-6 max-w-[60ch] text-sm leading-relaxed text-muted-foreground sm:text-base">{t("site.hero.copy")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <HeroDownload release={release} />
              <a href={`${RELEASES_URL}/latest`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-medium transition-colors hover:bg-secondary">
                {t("site.hero.notes")}
              </a>
            </div>
            <p className="mt-4 font-mono text-caption text-muted-foreground">
              {release ? t("site.hero.release", { version: release.version }) : t("site.hero.releaseUnknown")}
            </p>
            <ul aria-label={t("site.hero.agents")} className="mt-6 flex flex-wrap gap-2">
              {AGENTS.map((agent) => <li key={agent}><Badge variant="outline" mono className="bg-card">{agent}</Badge></li>)}
            </ul>
          </div>
          <Trace t={t} />
        </div>
      </section>

      <section id="features" className="scroll-mt-16 border-b border-border py-16 md:py-20">
        <div className="shell">
          <SectionHeading kicker={t("site.features.kicker")} title={t("site.features.title")} note={t("site.features.note")} />
          <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
            {FEATURES.map((id, index) => (
              <article key={id} className="grid content-start gap-3 bg-card p-6">
                <span className="font-mono text-caption tracking-wider text-muted-foreground uppercase">{String(index + 1).padStart(2, "0")} / {t(`site.features.${id}.tag` as Key)}</span>
                <h3 className="text-h3">{t(`site.features.${id}.title` as Key)}</h3>
                <p className="max-w-[48ch] text-sm leading-relaxed text-muted-foreground">{t(`site.features.${id}.detail` as Key)}</p>
                {id === "agents" && (
                  <div className="flex flex-wrap gap-1.5">{["Codex", "Claude", "Copilot", "Cursor"].map((agent) => <Badge key={agent} variant="secondary" mono>{agent}</Badge>)}</div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="downloads" className="scroll-mt-16 border-b border-border py-16 md:py-20">
        <div className="shell">
          <SectionHeading kicker={t("site.downloads.kicker")} title={t("site.downloads.title")} note={t("site.downloads.note")} />
          <Downloads release={release} />
        </div>
      </section>

      <section id="how" className="scroll-mt-16 border-b border-border py-16 md:py-20">
        <div className="shell grid overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-2">
          <div className="p-6 sm:p-10">
            <Eyebrow>{t("site.how.kicker")}</Eyebrow>
            <h2 className="flex gap-[1ch] text-h1"><span aria-hidden="true" className="text-go">❯</span><span>{t("site.how.title")}</span></h2>
            <p className="mt-4 max-w-[54ch] text-sm leading-relaxed text-muted-foreground">{t("site.how.detail")}</p>
          </div>
          <ol className="border-t border-border lg:border-t-0 lg:border-l">
            {STEPS.map((step) => (
              <li key={step} className="grid grid-cols-[3rem_1fr] gap-2 border-b border-border px-6 py-5 last:border-b-0">
                <span className="font-mono text-small text-muted-foreground">{String(step).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-h4">{t(`site.how.step${step}.title` as Key)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t(`site.how.step${step}.detail` as Key)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="shell flex flex-wrap items-center justify-between gap-4 py-10">
        <div>
          <p className="font-semibold">{t("site.privacy.title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("site.privacy.detail")}</p>
        </div>
        <a href={`https://github.com/${RELEASES_REPOSITORY}`} target="_blank" rel="noreferrer" className="font-mono text-small text-muted-foreground hover:text-foreground">github.com/JayV-Coder</a>
      </section>
    </SitePage>
  );
}
