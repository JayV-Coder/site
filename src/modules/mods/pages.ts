import { MODS_API } from "./config";
import { modText, pointsOf, type Catalog, type ModManifest } from "./rules";

/** A página de cada mod no site, como o repositório de mods a publica
 * (`pages.json`, pela função `mods`): o que ele faz, o que pede antes, os
 * passos que ele precisa além de ligar e como usar, nos dez idiomas, com os
 * prints da tela do app. Os passos de habilitar são iguais para todo mod e o
 * site os escreve (`site.modPages.enable.*`); o print `enable` de cada mod
 * mostra a aba Mods com ele. */

export const PAGES_SCHEMA = 1;

/** Um print: o nome, os idiomas em que ele existe e a marca do conteúdo (o
 * cache do navegador troca junto com o print). */
export interface PageImage { name: string; locales: string[]; v: string }
export interface PageStep { text: Record<string, string>; image: PageImage | null }
export interface ModPage {
  version: string | null;
  about: Record<string, string>;
  requirements: Record<string, string> | null;
  enable: PageImage | null;
  setup: PageStep[];
  use: PageStep[];
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const ID = /^[a-z][A-Za-z0-9-]{1,39}$/;
const IMAGE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOCALE = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,4})?$/;

function texts(value: unknown): Record<string, string> | null {
  if (!isObject(value)) return null;
  const out = Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim() !== ""));
  return Object.keys(out).length > 0 ? out : null;
}

function image(value: unknown): PageImage | null {
  if (!isObject(value) || typeof value.name !== "string" || !IMAGE.test(value.name) || !Array.isArray(value.locales)) return null;
  const locales = value.locales.filter((locale): locale is string => typeof locale === "string" && LOCALE.test(locale));
  if (!locales.length) return null;
  return { name: value.name, locales, v: typeof value.v === "string" && /^[0-9a-f]{1,40}$/.test(value.v) ? value.v : "" };
}

function steps(value: unknown): PageStep[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const text = isObject(item) ? texts(item.text) : null;
    return text ? [{ text, image: image((item as Record<string, unknown>).image) }] : [];
  });
}

/** Uma página como chegou, só com o que o site sabe mostrar; nula sem o que
 * ela diz que o mod faz. */
export function readPage(value: unknown): ModPage | null {
  if (!isObject(value)) return null;
  const about = texts(value.about);
  if (!about) return null;
  return {
    version: typeof value.version === "string" ? value.version : null,
    about,
    requirements: texts(value.requirements),
    enable: image(value.enable),
    setup: steps(value.setup),
    use: steps(value.use),
  };
}

/** Todas as páginas, pelo id do mod. Um formato que o site não conhece é nulo:
 * o catálogo continua, e cada mod mostra o resumo dele. */
export function readPages(value: unknown): Record<string, ModPage> | null {
  if (!isObject(value) || value.schema !== PAGES_SCHEMA || !isObject(value.pages)) return null;
  const out: Record<string, ModPage> = {};
  for (const [id, page] of Object.entries(value.pages)) {
    const read = ID.test(id) ? readPage(page) : null;
    if (read) out[id] = read;
  }
  return out;
}

/** O endereço do print no idioma da página (ou no inglês, quando ele não tem
 * aquele idioma), servido pela função `mods`. */
export function imageUrl(id: string, picture: PageImage, locale: string): string {
  const language = locale.split("-")[0];
  const shown = picture.locales.includes(locale) ? locale : picture.locales.find((known) => known.split("-")[0] === language) ?? (picture.locales.includes("en") ? "en" : picture.locales[0]);
  return `${MODS_API}/media/${encodeURIComponent(id)}/${picture.name}.${shown}.webp${picture.v ? `?v=${picture.v}` : ""}`;
}

/** O que o mod é, numa palavra: o primeiro ponto que ele usa. É a categoria
 * do catálogo do site, como o filtro da aba Mods do app. */
export type ModKind = "llmEngines" | "features" | "agents" | "skills" | "other";
export const MOD_KINDS: ModKind[] = ["llmEngines", "agents", "skills", "features", "other"];
export function kindOf(manifest: ModManifest): ModKind {
  const points = pointsOf(manifest);
  return (["llmEngines", "agents", "skills", "features"] as const).find((kind) => points.includes(kind)) ?? "other";
}

/** As skills que o mod traz e os servidores MCP de cada uma, para a página
 * dizer o que o Jev escolhe. */
export function modSkills(manifest: ModManifest): { name: string; servers: string[] }[] {
  const list = manifest.contributes?.skills;
  if (!Array.isArray(list)) return [];
  return list.flatMap((skill) => (isObject(skill) && typeof skill.name === "string"
    ? [{ name: skill.name, servers: Array.isArray(skill.mcpServers) ? skill.mcpServers.flatMap((server) => (isObject(server) && typeof server.name === "string" ? [server.name] : [])) : [] }]
    : []));
}

/** O mod casa com a busca: cada palavra aparece no título, no resumo, no que
 * ele faz, no id ou no autor, no idioma da página. */
export function matchesMod(query: string, fields: (string | null | undefined)[]): boolean {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = fields.filter(Boolean).join(" ").toLocaleLowerCase();
  return words.every((word) => haystack.includes(word));
}

/** Um mod como a página do catálogo o mostra, no idioma dela. */
export interface ModCard {
  id: string;
  title: string;
  summary: string;
  about: string;
  category: string;
  kind: ModKind;
  version: string | null;
  author: string | null;
  required: boolean;
  preinstalled: boolean;
  plan: boolean;
}

export function cardsOf(catalog: Catalog, pages: Record<string, ModPage> | null, locale: string): ModCard[] {
  return catalog.mods.map((manifest) => ({
    id: manifest.id,
    title: modText(manifest.title, locale),
    summary: modText(manifest.summary, locale),
    about: pages?.[manifest.id] ? modText(pages[manifest.id].about, locale) : "",
    category: manifest.category,
    kind: kindOf(manifest),
    version: manifest.version ?? null,
    author: manifest.author ?? null,
    required: manifest.required === true,
    preinstalled: manifest.preinstalled === true || manifest.required === true,
    plan: manifest.plan !== null && manifest.plan !== undefined,
  }));
}

/** Os cartões separados por tipo, na ordem de `MOD_KINDS`, sem os tipos
 * vazios. */
export function byKind(cards: ModCard[]): { kind: ModKind; cards: ModCard[] }[] {
  return MOD_KINDS.map((kind) => ({ kind, cards: cards.filter((card) => card.kind === kind) })).filter((group) => group.cards.length > 0);
}
