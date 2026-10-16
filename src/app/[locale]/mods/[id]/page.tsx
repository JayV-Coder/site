import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpenIcon, ExternalLinkIcon, SparklesIcon } from "lucide-react";
import { ModIcon } from "@/components/atoms";
import { GithubIcon } from "@/components/atoms/icons";
import { BackLink, PageHeading } from "@/components/molecules";
import { InstallInApp } from "@/components/organisms/mods/InstallInApp";
import { SitePage } from "@/components/organisms/SitePage";
import { Badge } from "@/components/ui/badge";
import { getT } from "@/modules/i18n/server";
import type { Key } from "@/modules/i18n/types";
import { imageUrl, kindOf, modSkills, type PageImage } from "@/modules/mods/pages";
import { modText } from "@/modules/mods/rules";
import { modCatalog, modPages } from "@/modules/mods/server";
import { effectiveState } from "@/modules/mods/state";
import { currentViewer } from "@/modules/auth/viewer";
import { loadOrganizations } from "../../dashboard/organizations/data";
import { loadModState } from "../../dashboard/mods/data";

const REPOSITORY = "https://github.com/JayV-Coder/jayv-coder-mods/tree/main/mods";

type Props = PageProps<"/[locale]/mods/[id]">;

async function load(id: string) {
  const [catalog, pages] = await Promise.all([modCatalog(), modPages()]);
  const manifest = catalog?.mods.find((mod) => mod.id === id) ?? null;
  return { catalog, manifest, page: pages?.[id] ?? null };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const [t, { manifest }] = await Promise.all([getT(locale), load(id)]);
  if (!manifest) return { title: `${t("site.modPages.title")} · JayV` };
  return { title: `${modText(manifest.title, locale)} · ${t("site.modPages.title")}`, description: modText(manifest.summary, locale) };
}

/** Um print da tela do app, no idioma da página: abre inteiro numa aba. */
function Shot({ id, picture, locale, alt, zoom }: { id: string; picture: PageImage; locale: string; alt: string; zoom: string }) {
  const src = imageUrl(id, picture, locale);
  return (
    <figure className="mt-3">
      <a href={src} target="_blank" rel="noreferrer" aria-label={zoom} title={zoom} className="block overflow-hidden rounded-md border border-border bg-muted transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        {/* O print vem da função `mods` (o repositório de mods), não do build do site. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} width={1280} height={800} loading="lazy" decoding="async" className="h-auto w-full" />
      </a>
    </figure>
  );
}

/** Um passo numerado, com o print dele embaixo quando há. */
function Step({ number, children, shot }: { number: number; children: ReactNode; shot?: ReactNode }) {
  return (
    <li className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3">
      <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full border border-border bg-background font-mono text-xs text-foreground">{number}</span>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm leading-relaxed">{children}</p>
        {shot}
      </div>
    </li>
  );
}

/** Onde quem entrou pode instalar o mod — o ambiente pessoal e o de cada
 * organização dele — e em quais ele já está, como o app vê (o gravado mais os
 * essenciais). Sem sessão, nada: o botão leva ao login. */
async function installTargets(id: string, catalog: Awaited<ReturnType<typeof modCatalog>>, personal: string) {
  const organizations = await loadOrganizations().catch(() => []);
  const environments = [{ id: "personal", name: personal }, ...organizations.map((organization) => ({ id: organization.id, name: organization.name }))];
  const states = await Promise.all(environments.map((environment) => loadModState(environment.id).catch(() => null)));
  const installedIn = environments.filter((_environment, index) => {
    const saved = states[index];
    return saved ? id in effectiveState(saved.stored, catalog, saved.legacy).mods : false;
  }).map((environment) => environment.id);
  return { environments, installedIn };
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-3 rounded-lg border border-border bg-card p-5 md:p-6">
      <h2 id={id} className="flex gap-[1ch] text-h2 font-semibold"><span aria-hidden="true" className="text-go">❯</span>{title}</h2>
      {children}
    </section>
  );
}

/** A página de um mod: o que ele faz, o que pede, como habilitar (os passos
 * que todo mod tem, escritos pelo site, e os dele) e como usar, com os prints
 * da tela do app. O conteúdo mora com o mod no repositório de mods: mod novo
 * chega com a página pronta. */
export default async function ModPageView({ params }: Props) {
  const { locale, id } = await params;
  const [t, { catalog, manifest, page }] = await Promise.all([getT(locale), load(id)]);
  if (!manifest) notFound();
  const name = modText(manifest.title, locale);
  const kind = kindOf(manifest);
  const required = manifest.required === true;
  const preinstalled = required || manifest.preinstalled === true;
  const text = (value: Record<string, string> | null | undefined) => modText(value ?? undefined, locale);
  const zoom = t("site.modPages.zoom");
  const shot = (picture: PageImage | null, step: string) => picture && <Shot id={id} picture={picture} locale={locale} alt={t("site.modPages.shot", { step })} zoom={zoom} />;
  const requires = (manifest.requires ?? []).map((other) => ({ id: other, title: modText(catalog?.mods.find((mod) => mod.id === other)?.title, locale) || other }));
  const skills = modSkills(manifest);

  // Instalar é aqui, no topo da página, com a pessoa logada: o site grava o
  // mod na conta e o app sincroniza na hora.
  const viewer = required ? null : await currentViewer();
  const targets = viewer ? await installTargets(id, catalog, t("site.mods.environment.personal")) : null;
  const enableSteps: { text: string; image?: PageImage | null }[] = required ? [] : [
    { text: t("site.modPages.install.step1", { name }) },
    { text: t("site.modPages.install.step2", { name }), image: page?.enable ?? null },
  ];
  const setup = (page?.setup ?? []).map((step) => ({ text: text(step.text), image: step.image }));

  return (
    <SitePage locale={locale}>
      <div className="shell grid max-w-4xl gap-6 py-8 md:py-12">
        <BackLink href={`/${locale}/mods`}>{t("site.modPages.back")}</BackLink>
        <PageHeading
          eyebrow={t("site.modPages.eyebrow")}
          title={name}
          description={modText(manifest.summary, locale)}
          mark={(
            <span aria-hidden="true" className="flex size-14 flex-none items-center justify-center rounded-lg border border-border bg-card text-foreground">
              <ModIcon icon={manifest.icon} className="size-8" />
            </span>
          )}
        />
        <div className="-mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{t(`site.modPages.kind.${kind}` as Key)}</Badge>
          {required
            ? <Badge variant="outline" title={t("site.modPages.essential.hint")}>{t("site.modPages.essential")}</Badge>
            : <Badge variant="outline">{t(preinstalled ? "site.modPages.preinstalled" : "site.modPages.optional")}</Badge>}
          {manifest.plan && <Badge variant="outline">{t("site.modPages.plan")}</Badge>}
          {manifest.version && <Badge variant="secondary" mono>{t("site.modPages.version", { version: manifest.version })}</Badge>}
          {manifest.author && <span className="text-xs text-muted-foreground">{t("site.modPages.by", { author: manifest.author })}</span>}
          {manifest.minApp && <span className="font-mono text-caption text-muted-foreground">· {t("site.modPages.minApp", { version: manifest.minApp })}</span>}
        </div>

        {!required && (
          <InstallInApp
            mod={id}
            name={name}
            signedIn={viewer !== null}
            loginHref={`/${locale}/login?next=${encodeURIComponent(`/${locale}/mods/${id}`)}`}
            environments={targets?.environments ?? []}
            installedIn={targets?.installedIn ?? []}
          />
        )}

        <Section id="about" title={t("site.modPages.about")}>
          {page ? <p className="text-sm leading-relaxed text-foreground/90">{text(page.about)}</p> : <p className="text-sm text-muted-foreground">{t("site.modPages.noSteps")}</p>}
          {skills.map((skill) => (
            <p key={skill.name} className="flex gap-2 rounded-md border border-border bg-muted/40 px-3.5 py-2.5 text-sm leading-relaxed text-muted-foreground">
              <SparklesIcon aria-hidden="true" className="mt-1 size-3.5 flex-none text-go" />
              <span>{skill.servers.length > 0 ? t("site.modPages.skill.mcp", { name: skill.name, servers: skill.servers.join(", ") }) : t("site.modPages.skill", { name: skill.name })}</span>
            </p>
          ))}
          {requires.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {t("site.modPages.requires")}{" "}
              {requires.map((other, index) => (
                <span key={other.id}>{index > 0 && ", "}<Link href={`/${locale}/mods/${other.id}`} className="text-foreground underline-offset-4 hover:underline">{other.title}</Link></span>
              ))}
            </p>
          )}
        </Section>

        {page?.requirements && (
          <Section id="requirements" title={t("site.modPages.requirements")}>
            <p className="text-sm leading-relaxed text-foreground/90">{text(page.requirements)}</p>
          </Section>
        )}

        <Section id="enable" title={t("site.modPages.enable")}>
          {required && (
            <>
              <p className="text-sm leading-relaxed text-foreground/90">{t("site.modPages.enable.essential", { name })}</p>
              {shot(page?.enable ?? null, t("site.modPages.enable.essential", { name }))}
            </>
          )}
          {!required && preinstalled && <p className="text-sm leading-relaxed text-muted-foreground">{t("site.modPages.enable.preinstalled", { name })}</p>}
          {(enableSteps.length > 0 || setup.length > 0) && (
            <ol className="grid gap-5">
              {[...enableSteps, ...setup].map((step, index) => <Step key={index} number={index + 1} shot={shot(step.image ?? null, step.text)}>{step.text}</Step>)}
            </ol>
          )}
          {!required && (
            <p className="text-xs text-muted-foreground">
              {t("site.modPages.enable.site")}{" "}
              <Link href={`/${locale}/dashboard/mods`} className="text-foreground underline-offset-4 hover:underline">{t("site.modPages.enable.dashboard")}</Link>
            </p>
          )}
        </Section>

        {page && page.use.length > 0 && (
          <Section id="use" title={t("site.modPages.use")}>
            <ol className="grid gap-5">
              {page.use.map((step, index) => <Step key={index} number={index + 1} shot={shot(step.image, text(step.text))}>{text(step.text)}</Step>)}
            </ol>
          </Section>
        )}

        <div className="flex flex-wrap gap-2">
          {manifest.docs && (
            <Link href={`/${locale}/docs#${manifest.docs}`} className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3.5 text-sm font-medium transition-colors hover:bg-secondary">
              <BookOpenIcon aria-hidden="true" className="size-4" />{t("site.modPages.docs")}
            </Link>
          )}
          {manifest.homepage && (
            <a href={manifest.homepage} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3.5 text-sm font-medium transition-colors hover:bg-secondary">
              <ExternalLinkIcon aria-hidden="true" className="size-4" />{t("site.modPages.homepage", { name })}
            </a>
          )}
          <a href={`${REPOSITORY}/${id}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3.5 text-sm font-medium transition-colors hover:bg-secondary">
            <GithubIcon aria-hidden="true" className="size-4" />{t("site.modPages.source")}
          </a>
        </div>
      </div>
    </SitePage>
  );
}
