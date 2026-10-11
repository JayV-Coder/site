import type { Key } from "@/modules/i18n/types";

/** Os mods do JayV moram no repositório `JayV-Coder/jayv-coder-mods`; o site
 * lê o catálogo pela função `mods` do Supabase. O mod que a pessoa cria aqui é
 * uma linha da configuração sincronizada dela (`llm_agents`, com o id
 * `mod-<nome>`), no ambiente escolhido: o app a recebe na próxima volta do
 * sync, como se ela tivesse criado lá. As regras são as do app
 * (`src/modules/settings/mods.ts` e `mods::custom` no núcleo). */

export type ModKind = "llm" | "feature" | "template";

export type ModTemplate =
  | { kind: "api"; protocol: "openai" | "anthropic"; baseUrl: string; keyRequired: boolean; models?: string[] }
  | { kind: "cli"; command: string; args: string[]; planArgs?: string[]; edits?: boolean; models?: string[] };

/** Um mod como o catálogo o descreve. Os textos vêm nos dez idiomas. */
export interface ModManifest {
  id: string;
  kind: ModKind;
  category: string;
  plan: string | null;
  defaultOn?: boolean;
  minApp?: string;
  docs?: string;
  homepage?: string;
  title: Record<string, string>;
  summary: Record<string, string>;
  template?: ModTemplate;
}

export interface Catalog { schema: number; mods: ModManifest[] }

/** O formato do catálogo que o site entende. */
export const CATALOG_SCHEMA = 1;

/** O prefixo dos mods criados: nenhum motor do app começa assim. */
export const CUSTOM_PREFIX = "mod-";
/** Quantos mods criados um ambiente aceita (o `MAX_MODS` do app). */
export const MAX_MODS = 20;
export const NAME_MAX = 40;
const ARGS_MAX = 64;
const ARG_MAX = 1000;
export const MODEL = /^[A-Za-z0-9._:/@[\]-]{1,120}$/;

/** O catálogo como desceu, só com o que o site sabe mostrar: o formato certo e
 * os mods com id, tipo e textos. Nulo quando nem isso dá para ler. */
export function readCatalog(value: unknown): Catalog | null {
  if (typeof value !== "object" || value === null) return null;
  const { schema, mods } = value as { schema?: unknown; mods?: unknown };
  if (schema !== CATALOG_SCHEMA || !Array.isArray(mods)) return null;
  const kept = mods.filter((mod): mod is ModManifest => {
    if (typeof mod !== "object" || mod === null) return false;
    const item = mod as Partial<ModManifest>;
    return typeof item.id === "string" && (item.kind === "llm" || item.kind === "feature" || item.kind === "template")
      && typeof item.title === "object" && item.title !== null && typeof item.summary === "object" && item.summary !== null;
  });
  return { schema, mods: kept };
}

/** O texto de um mod no idioma da página: o do idioma, o da língua (`pt` para
 * `pt-BR`), o inglês ou o primeiro que houver. */
export function modText(texts: Record<string, string> | undefined, locale: string): string {
  if (!texts) return "";
  const language = locale.split("-")[0];
  const near = Object.keys(texts).find((key) => key.split("-")[0] === language);
  return texts[locale] ?? (near ? texts[near] : undefined) ?? texts.en ?? Object.values(texts)[0] ?? "";
}

/** A linha de comando em argumentos, como o shell separaria com aspas
 * simples e duplas — sem expandir nada. */
export function splitLine(line: string): string[] {
  const args: string[] = [];
  let current = "";
  let quote: string | null = null;
  let started = false;
  for (const char of line) {
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
    } else if (char === "\"" || char === "'") {
      quote = char;
      started = true;
    } else if (/\s/.test(char)) {
      if (started) { args.push(current); current = ""; started = false; }
    } else {
      current += char;
      started = true;
    }
  }
  if (started) args.push(current);
  return args;
}

/** Os argumentos de volta numa linha para editar. */
export function joinLine(args: string[]): string {
  return args.map((arg) => {
    if (arg !== "" && !/[\s"']/.test(arg)) return arg;
    return arg.includes("\"") ? `'${arg}'` : `"${arg}"`;
  }).join(" ");
}

const PLACEHOLDER = /\{[A-Za-z0-9_]+\}/g;

/** O que está errado numa linha de comando, ou `null`: só `{model}` (em
 * qualquer parte) e `{prompt}` (sozinho num argumento). */
export function lineProblem(args: string[]): Key | null {
  if (args.length > ARGS_MAX) return "mods.args.tooMany";
  for (const arg of args) {
    // eslint-disable-next-line no-control-regex
    if (arg === "" || arg.length > ARG_MAX || /[\u0000-\u001f\u007f]/.test(arg)) return "mods.args.invalid";
    const rest = arg === "{prompt}" ? "" : arg.replaceAll("{model}", "");
    if ((rest.match(PLACEHOLDER) ?? []).length > 0) return "mods.args.placeholder";
  }
  return null;
}

/** O id de um mod criado a partir do nome: `mod-` e até 28 letras minúsculas,
 * dígitos ou `-`, sem repetir um id que já existe. */
export function modId(name: string, taken: readonly string[]): string {
  const base = name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 28).replace(/-+$/, "") || "mod";
  let id = `${CUSTOM_PREFIX}${base}`;
  for (let n = 2; taken.includes(id); n++) id = `${CUSTOM_PREFIX}${base}-${n}`;
  return id;
}

/** O id do mod pronto instalado: o mesmo que o app usa (`templateAgentId`). */
export const templateAgentId = (manifest: Pick<ModManifest, "id">) => `${CUSTOM_PREFIX}${manifest.id}`;

/** O que a pessoa escreve no formulário. As linhas vão como foram digitadas. */
export interface ModDraft {
  name: string;
  kind: "cli" | "api";
  command: string;
  args: string;
  planArgs: string;
  edits: boolean;
  protocol: "openai" | "anthropic";
  baseUrl: string;
  keyRequired: boolean;
  /** O primeiro modelo, só ao criar. */
  model: string;
}

export const EMPTY_DRAFT: ModDraft = { name: "", kind: "cli", command: "", args: "", planArgs: "", edits: false, protocol: "openai", baseUrl: "", keyRequired: false, model: "" };

/** Os problemas do formulário, campo a campo, como o app os mostra. */
export function draftProblems(draft: ModDraft): Partial<Record<keyof ModDraft, Key>> {
  const found: Partial<Record<keyof ModDraft, Key>> = {};
  if (!draft.name.trim() || draft.name.trim().length > NAME_MAX) found.name = "mods.name.empty";
  if (draft.kind === "cli") {
    const command = draft.command.trim();
    if (!command) found.command = "site.mods.command.empty";
    else if (/\s/.test(command)) found.command = "mods.command.hint";
    const args = lineProblem(splitLine(draft.args));
    if (args) found.args = args;
    const plan = lineProblem(splitLine(draft.planArgs));
    if (plan) found.planArgs = plan;
    else if (draft.edits && splitLine(draft.planArgs).length === 0) found.planArgs = "mods.planArgs.required";
  } else {
    const url = draft.baseUrl.trim();
    if (!url) found.baseUrl = "mods.baseUrl.required";
    else if (!/^https?:\/\/[^\s/@]+/i.test(url)) found.baseUrl = "site.mods.baseUrl.invalid";
  }
  if (draft.model.trim() && !MODEL.test(draft.model.trim())) found.model = "site.mods.model.invalid";
  return found;
}

/** A definição do mod nas opções do agente, como o núcleo a lê
 * (`CustomOptions`). `kept` são as opções que já estavam gravadas: o que é da
 * máquina (há chave guardada, aprovação dos servidores MCP) fica como estava. */
export function optionsOf(draft: ModDraft, kept: Record<string, unknown> = {}): Record<string, unknown> {
  const cli = draft.kind === "cli";
  const api = !cli;
  return {
    ...kept,
    name: draft.name.trim(),
    kind: draft.kind,
    args: cli ? splitLine(draft.args) : [],
    planArgs: cli ? splitLine(draft.planArgs) : [],
    edits: cli && draft.edits,
    protocol: draft.protocol,
    baseUrl: api ? draft.baseUrl.trim() : "",
    keyRequired: api && draft.keyRequired,
    hasKey: kept.hasKey === true,
    // O cliente MCP do app só fala o protocolo da OpenAI.
    approveMcps: api && draft.protocol === "openai" && kept.approveMcps === true,
  };
}

/** O formulário a partir de um mod gravado (para editar). */
export function draftOf(options: Record<string, unknown>, command: string): ModDraft {
  const list = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
  return {
    name: typeof options.name === "string" ? options.name : "",
    kind: options.kind === "api" ? "api" : "cli",
    command,
    args: joinLine(list(options.args)),
    planArgs: joinLine(list(options.planArgs)),
    edits: options.edits === true,
    protocol: options.protocol === "anthropic" ? "anthropic" : "openai",
    baseUrl: typeof options.baseUrl === "string" ? options.baseUrl : "",
    keyRequired: options.keyRequired === true,
    model: "",
  };
}

/** O formulário a partir de um mod pronto do catálogo. */
export function draftOfTemplate(manifest: ModManifest, locale: string): ModDraft | null {
  const template = manifest.template;
  if (!template) return null;
  const name = modText(manifest.title, locale).slice(0, NAME_MAX);
  if (template.kind === "api") {
    return { ...EMPTY_DRAFT, name, kind: "api", protocol: template.protocol, baseUrl: template.baseUrl, keyRequired: template.keyRequired, model: template.models?.[0] ?? "" };
  }
  return { ...EMPTY_DRAFT, name, kind: "cli", command: template.command, args: joinLine(template.args), planArgs: joinLine(template.planArgs ?? []), edits: template.edits ?? false, model: template.models?.[0] ?? "" };
}

/** O ambiente pedido pela página: o pessoal ou o id de uma organização. */
export function environmentOk(value: string): boolean {
  return value === "personal" || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
}
