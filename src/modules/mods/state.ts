import { pointsOf, type Catalog, type ModManifest } from "./rules";

/** O que cada ambiente fez com os mods do catálogo, como o app guarda
 * (`jayv_mods::state`): a linha `installedMods` de `account_settings`, que
 * sincroniza com o ambiente. O site grava a mesma linha; cada máquina, na
 * próxima volta do sync, roda o que instalar e desinstalar pede (os agentes que
 * um mod traz são criados pelo app). A linha antiga `mods` (recurso → ligado)
 * vai junto, para o app 0.94 de alguma máquina seguir o que se escolheu aqui. */

export const STATE_KEY = "installedMods";
export const LEGACY_KEY = "mods";

export interface InstalledMod { enabled: boolean; version?: string | null; installedAt?: string | null }
export interface InstalledMods { mods: Record<string, InstalledMod>; removed: string[] }

const ID = /^[a-z][A-Za-z0-9-]{1,39}$/;
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** O estado gravado, limpo. Nulo quando não há ou não se lê: vale o que vem de
 * fábrica, como no app. */
export function readState(value: unknown): InstalledMods | null {
  let parsed = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value) as unknown; } catch { return null; }
  }
  if (!isObject(parsed)) return null;
  const mods: Record<string, InstalledMod> = {};
  if (isObject(parsed.mods)) {
    for (const [id, item] of Object.entries(parsed.mods)) {
      if (!ID.test(id) || !isObject(item) || typeof item.enabled !== "boolean") continue;
      mods[id] = { enabled: item.enabled, ...(typeof item.version === "string" ? { version: item.version } : {}), ...(typeof item.installedAt === "string" ? { installedAt: item.installedAt } : {}) };
    }
  }
  const removed = Array.isArray(parsed.removed) ? parsed.removed.filter((id): id is string => typeof id === "string" && ID.test(id) && !(id in mods)) : [];
  return { mods, removed: [...new Set(removed)] };
}

/** As escolhas do app 0.94 (recurso → ligado). */
export function readLegacy(value: unknown): Record<string, boolean> {
  let parsed = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value) as unknown; } catch { return {}; }
  }
  if (!isObject(parsed)) return {};
  return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"));
}

const byId = (catalog: Catalog | null) => new Map((catalog?.mods ?? []).map((manifest) => [manifest.id, manifest]));

/** O estado com o mod e as dependências dele instalados (e ligados, quando
 * chegam agora). */
export function withRequirements(state: InstalledMods, catalog: Catalog | null): InstalledMods {
  const mods = { ...state.mods };
  const removed = new Set(state.removed);
  const known = byId(catalog);
  const queue = Object.keys(mods);
  while (queue.length > 0) {
    const id = queue.pop()!;
    for (const other of known.get(id)?.requires ?? []) {
      const target = known.get(other);
      if (!target || mods[other]) continue;
      mods[other] = { enabled: true, version: target.version ?? null };
      removed.delete(other);
      queue.push(other);
    }
  }
  return { mods, removed: [...removed] };
}

/** O estado com os mods essenciais instalados e ligados, seja o que for que se
 * gravou: ninguém os desliga nem os desinstala (`resolve::with_required` do
 * app). */
export function withRequired(state: InstalledMods, catalog: Catalog | null): InstalledMods {
  const mods = { ...state.mods };
  const required = (catalog?.mods ?? []).filter((manifest) => manifest.required === true);
  for (const manifest of required) mods[manifest.id] = mods[manifest.id] ? { ...mods[manifest.id], enabled: true } : { enabled: true, version: manifest.version ?? null };
  return { mods, removed: state.removed.filter((id) => !required.some((manifest) => manifest.id === id)) };
}

/** O mod do catálogo é essencial. */
export const isRequired = (catalog: Catalog | null, id: string) => byId(catalog).get(id)?.required === true;

/** O estado que conta, como o app o calcula: o gravado e os mods de fábrica
 * que o ambiente não tem nem desinstalou, com os essenciais sempre ligados;
 * sem nada gravado, as escolhas do app 0.94 valem. */
export function effectiveState(stored: InstalledMods | null, catalog: Catalog | null, legacy: Record<string, boolean>): InstalledMods {
  const state: InstalledMods = stored
    ? { mods: { ...stored.mods }, removed: [...stored.removed] }
    : { mods: Object.fromEntries(Object.entries(legacy).filter(([id]) => ID.test(id)).map(([id, enabled]) => [id, { enabled }])), removed: [] };
  for (const manifest of catalog?.mods ?? []) {
    if (!manifest.preinstalled || state.mods[manifest.id] || state.removed.includes(manifest.id)) continue;
    state.mods[manifest.id] = { enabled: true, version: manifest.version ?? null };
  }
  return withRequirements(withRequired(state, catalog), catalog);
}

/** Uma mudança pedida pela página. */
export type ModChange = { id: string; action: "install" | "uninstall" | "enable" | "disable" };

/** O estado depois da mudança. Instalar e ligar puxam as dependências;
 * desinstalar um mod de fábrica o guarda entre os removidos, para não voltar
 * sozinho. Nulo quando a mudança não faz sentido (o mod não está no catálogo,
 * não está instalado, ou é essencial e a mudança o desligaria). */
export function changed(state: InstalledMods, catalog: Catalog | null, change: ModChange, now: string): InstalledMods | null {
  const manifest = byId(catalog).get(change.id);
  if (manifest?.required && (change.action === "disable" || change.action === "uninstall")) return null;
  const current = state.mods[change.id];
  switch (change.action) {
    case "install":
    case "enable": {
      if (!manifest) return null;
      const mods = { ...state.mods, [change.id]: current ? { ...current, enabled: true } : { enabled: true, version: manifest.version ?? null, installedAt: now } };
      return withRequirements({ mods, removed: state.removed.filter((id) => id !== change.id) }, catalog);
    }
    case "disable":
      return current ? { ...state, mods: { ...state.mods, [change.id]: { ...current, enabled: false } } } : null;
    case "uninstall": {
      if (!current) return null;
      const { [change.id]: _gone, ...mods } = state.mods;
      const removed = manifest?.preinstalled ? [...new Set([...state.removed, change.id])] : state.removed;
      return { mods, removed };
    }
  }
}

/** Os mods que valem: instalados, ligados, no catálogo e com as dependências
 * valendo. */
export function activeMods(state: InstalledMods, catalog: Catalog | null): Set<string> {
  const known = byId(catalog);
  const answers = new Map<string, boolean>();
  const visit = (id: string, open: Set<string>): boolean => {
    if (answers.has(id)) return answers.get(id)!;
    if (open.has(id)) return false;
    open.add(id);
    const manifest = known.get(id);
    const answer = (state.mods[id]?.enabled ?? false) && manifest !== undefined && (manifest.requires ?? []).every((other) => visit(other, open));
    open.delete(id);
    answers.set(id, answer);
    return answer;
  };
  return new Set((catalog?.mods ?? []).map((manifest) => manifest.id).filter((id) => visit(id, new Set())));
}

/** A linha do app 0.94: cada recurso e motor de LLM que algum mod do catálogo
 * traz, ligado se um mod ativo o traz. */
export function legacyStates(state: InstalledMods, catalog: Catalog | null): Record<string, boolean> {
  const active = activeMods(state, catalog);
  const targets = (manifest: ModManifest) => ["features", "llmEngines"].flatMap((point) => {
    const value = manifest.contributes?.[point];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  });
  const out: Record<string, boolean> = {};
  for (const manifest of catalog?.mods ?? []) for (const target of targets(manifest)) out[target] = (out[target] ?? false) || active.has(manifest.id);
  return out;
}

/** O mod pede um app mais novo que a versão dita ou usa um ponto que o site
 * não conhece (o app pode conhecer). */
export function usesUnknownPoints(manifest: ModManifest, known: readonly string[]): boolean {
  return pointsOf(manifest).some((point) => !known.includes(point));
}
