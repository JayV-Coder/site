/** O changelog e a documentação como a função `releases` os devolve. O texto
 * vem em inglês; a página troca pelo idioma dela quando a chave existe. */

export type ChangeKind = "feature" | "fix";
export interface ChangeItem { kind: ChangeKind; id: string; title: string | null; detail: string | null }
export interface ChangeRelease { version: string; date: string; items: ChangeItem[] }

export type CommandKind = "chat" | "shortcut" | "cli";
export interface ManualCommand { id: string; kind: CommandKind; usage: string; detail: string }
export interface ManualFeature {
  id: string;
  category: string;
  since: string | null;
  plan: string | null;
  commands: string[];
  title: string;
  summary: string;
  usage: string;
}
export interface Manual { version: string | null; updatedAt: string | null; features: ManualFeature[]; commands: ManualCommand[] }

/** As categorias que a página conhece, na ordem em que aparecem. Uma
 * categoria nova do app, que o site ainda não conhece, cai em "other". */
export const CATEGORIES = ["start", "chat", "agents", "gate", "privacy", "project", "team", "account", "app", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export const COMMAND_KINDS: CommandKind[] = ["chat", "shortcut", "cli"];

export const categoryOf = (value: string): Category => ((CATEGORIES as readonly string[]).includes(value) ? (value as Category) : "other");

/** As funcionalidades por categoria, na ordem da documentação, sem as vazias. */
export function byCategory<T extends { category: string }>(features: T[]) {
  return CATEGORIES
    .map((category) => ({ category, features: features.filter((feature) => categoryOf(feature.category) === category) }))
    .filter((group) => group.features.length > 0);
}

/** O atalho como cada sistema o escreve: `Mod+K` vira `⌘K` no Mac e
 * `Ctrl+K` no resto (`Strg+K` no teclado alemão, pelo `ctrl` traduzido). */
export function shortcutText(usage: string, mac: boolean, ctrl = "Ctrl") {
  const keys = usage.split("+").map((key) => (key === "Mod" ? (mac ? "⌘" : ctrl) : key));
  return mac ? keys.join("") : keys.join("+");
}

/** A âncora de uma versão na página de notas (`#v0-62-0`). */
export const versionAnchor = (version: string) => `v${version.replace(/[^0-9A-Za-z]+/g, "-")}`;

/** O texto traduzido da chave, ou o inglês que veio no JSON. */
export const localized = (texts: Record<string, string>, key: string, fallback: string | null | undefined) => texts[key] ?? fallback ?? "";

/** Filtra a documentação pelo que se digitou: título, resumo, uso e comandos. */
export function matches(query: string, ...fields: (string | null | undefined)[]) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = fields.filter(Boolean).join(" ").toLowerCase();
  return words.every((word) => haystack.includes(word));
}
