import { imageUrl, kindOf, type ModPage, type PageImage } from "@/modules/mods/pages";
import type { Catalog, ModManifest } from "@/modules/mods/rules";
import type { ChangeItem, ChangeRelease, Manual, ManualFeature } from "@/modules/releases/content";

/** A página inicial mostra o app em vez de só descrevê-lo: os prints são os
 * das páginas dos mods (`pages.json` do repositório de mods, pela função
 * `mods`), tirados da tela de verdade pelo estúdio, nos dez idiomas. Nada
 * aqui baixa nada: as funções recebem o que o servidor leu e dizem o que cada
 * seção mostra. Sem um dado (a função fora do ar), a seção sai sem ele. */

/** Um print de uma página de mod: o mod e o nome do print (`chat`, `enable`…). */
export interface Shot { mod: string; name: string }

/** A tela do topo: o chat com o Jev. */
export const HERO_SHOT: Shot = { mod: "claude", name: "chat" };

/** O print de cada novidade que tem tela, pelo id do item no changelog do app
 * (`releases.ts`). Uma versão nova com tela ganha a sua linha aqui; sem linha,
 * a faixa da novidade sai só com o texto. */
export const RELEASE_SHOTS: Record<string, Shot> = {
  onlyEssentials: { mod: "claude", name: "enable" },
  essentialsTab: { mod: "stats", name: "enable" },
  installFromSite: { mod: "claude", name: "enable" },
};

/** Os itens de uma versão que levam ao catálogo de mods (o botão da faixa). */
const MOD_ITEMS = new Set(["onlyEssentials", "essentialsTab", "installFromSite"]);

/** As células da grade, na ordem: o id da funcionalidade no manual e, na
 * última linha, a ação de cada uma (a página do mod ou o catálogo). */
export type GridAction = { kind: "mod"; mod: string } | { kind: "catalog" };
export const GRID: { id: string; action?: GridAction }[] = [
  { id: "entryGate" },
  { id: "exitGate" },
  { id: "answerEvidence" },
  { id: "adaptiveRouting" },
  { id: "planFirst" },
  { id: "secondOpinion" },
  { id: "parallelTasks", action: { kind: "mod", mod: "parallelTasks" } },
  { id: "projectNotes", action: { kind: "mod", mod: "projectNotes" } },
  { id: "modCatalog", action: { kind: "catalog" } },
];

/** As telas da vitrine, alternando de lado: o id da funcionalidade no manual,
 * o print (do mod que a traz) e, se houver, a lista curta embaixo do texto
 * (`site.showcase.<id>.<ponto>`); o ponto `open` é o que não foi conferido. */
export const SHOWCASE: { id: string; shot: Shot; points?: { id: string; open?: boolean }[] }[] = [
  { id: "gateBoard", shot: { mod: "gateBoard", name: "gate" }, points: [{ id: "entry" }, { id: "exit" }, { id: "unverified", open: true }] },
  { id: "liveFiles", shot: { mod: "liveFiles", name: "live" } },
  { id: "parallelTasks", shot: { mod: "parallelTasks", name: "chat" } },
];

/** O print com esse nome na página do mod: o de habilitar ou o de um passo. */
export function findPicture(page: ModPage | undefined, name: string): PageImage | null {
  if (!page) return null;
  if (page.enable?.name === name) return page.enable;
  return [...page.setup, ...page.use].map((step) => step.image).find((image) => image?.name === name) ?? null;
}

/** O endereço do print no idioma da página, ou nulo sem a página do mod ou
 * sem o print. */
export function shotUrl(pages: Record<string, ModPage> | null, shot: Shot, locale: string): string | null {
  const picture = findPicture(pages?.[shot.mod], shot.name);
  return picture ? imageUrl(shot.mod, picture, locale) : null;
}

/** A versão que a página apresenta: a publicada, se o changelog a tem; senão a
 * mais nova do changelog. */
export function currentRelease(releases: ChangeRelease[] | null, version: string | null): ChangeRelease | null {
  if (!releases?.length) return null;
  return (version ? releases.find((release) => release.version === version) : undefined) ?? releases[0];
}

/** As novidades do aviso do topo: as funcionalidades novas da versão (ou,
 * sem nenhuma, as correções), até quatro. */
export function highlights(release: ChangeRelease | null, limit = 4): ChangeItem[] {
  if (!release) return [];
  const features = release.items.filter((item) => item.kind === "feature");
  return (features.length ? features : release.items).slice(0, limit);
}

/** A novidade da faixa: a primeira que tem print; sem nenhuma, a primeira. O
 * botão do catálogo só aparece quando ela é sobre mods. */
export function spotlight(release: ChangeRelease | null): { item: ChangeItem; shot: Shot | null; mods: boolean } | null {
  const items = highlights(release);
  const item = items.find((candidate) => RELEASE_SHOTS[candidate.id]) ?? items[0];
  if (!item) return null;
  return { item, shot: RELEASE_SHOTS[item.id] ?? null, mods: MOD_ITEMS.has(item.id) };
}

/** As funcionalidades do manual pelo id, para a grade e a vitrine. */
export function manualById(manual: Manual | null): Map<string, ManualFeature> {
  return new Map((manual?.features ?? []).map((feature) => [feature.id, feature]));
}

/** As células da grade que o manual tem, na ordem da grade; a que chegou na
 * versão apresentada ganha o selo de nova. */
export function gridCells(manual: Manual | null, version: string | null) {
  const features = manualById(manual);
  return GRID.flatMap((cell) => {
    const feature = features.get(cell.id);
    return feature ? [{ ...cell, feature, isNew: !!version && feature.since === version }] : [];
  });
}

/** Os mods da faixa "funciona com": os motores de LLM e os agentes do
 * catálogo, na ordem dele. Os essenciais não entram: são recursos do app. */
export function worksWith(catalog: Catalog | null): ModManifest[] {
  return (catalog?.mods ?? []).filter((manifest) => !manifest.required && (kindOf(manifest) === "llmEngines" || kindOf(manifest) === "agents"));
}
