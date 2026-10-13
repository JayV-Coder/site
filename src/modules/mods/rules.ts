import type { Key } from "@/modules/i18n/types";

/** Os mods do JayV moram no repositório `JayV-Coder/jayv-coder-mods`; o site
 * lê o catálogo pela função `mods` do Supabase. Instalar, ligar, desligar e
 * desinstalar um mod do catálogo é o estado do ambiente (`./state`). O mod que
 * a pessoa cria aqui é
 * uma linha da configuração sincronizada dela (`llm_agents`, com o id
 * `mod-<nome>`), no ambiente escolhido: o app a recebe na próxima volta do
 * sync, como se ela tivesse criado lá. As regras são as do app
 * (`src/modules/settings/mods.ts` e `mods::custom` no núcleo). */

/** Um agente que um mod do catálogo traz (o ponto `agents`): a definição de
 * um mod criado, sem o que é da máquina. Instalado, vira o agente
 * `mod-<id do mod>` (`-2`, `-3`… para os seguintes). */
export type ModAgent =
  | { kind: "api"; protocol: "openai" | "anthropic"; baseUrl: string; keyRequired: boolean; models?: string[] }
  | { kind: "cli"; command: string; args: string[]; planArgs?: string[]; edits?: boolean; models?: string[] };

/** O que um mod traz a cada ponto de extensão do app, pela chave do ponto. */
export interface ModContributions {
  llmEngines?: string[];
  features?: string[];
  agents?: ModAgent[];
  [point: string]: unknown;
}

/** Um mod como o catálogo genérico o descreve: um pacote com nome, versão e
 * autor, que traz alguma coisa a um ou mais pontos de extensão do app. Os
 * textos vêm nos dez idiomas. */
export interface ModManifest {
  id: string;
  version?: string;
  category: string;
  plan: string | null;
  minApp?: string;
  /** Instalado, e ligado, no login de quem ainda não o tem. */
  preinstalled?: boolean;
  /** Essencial: fica sempre instalado e ligado; ninguém o desliga nem o
   * desinstala (o plano continua mandando no que ele traz). */
  required?: boolean;
  /** Os mods de que ele precisa instalados e ligados. */
  requires?: string[];
  author?: string;
  docs?: string;
  homepage?: string;
  title: Record<string, string>;
  summary: Record<string, string>;
  contributes: ModContributions;
}

export interface Catalog { schema: number; mods: ModManifest[] }

/** O formato do catálogo genérico, e o antigo, que o site ainda lê (a função
 * de antes dele). */
export const CATALOG_SCHEMA = 2;
export const LEGACY_SCHEMA = 1;

/** Os pontos de extensão que o site sabe mostrar. */
export const KNOWN_POINTS = ["llmEngines", "features", "agents"] as const;

/** O prefixo dos mods criados: nenhum motor do app começa assim. */
export const CUSTOM_PREFIX = "mod-";
/** Quantos mods criados um ambiente aceita (o `MAX_MODS` do app). */
export const MAX_MODS = 20;
export const NAME_MAX = 40;
const ARGS_MAX = 64;
const ARG_MAX = 1000;
export const MODEL = /^[A-Za-z0-9._:/@[\]-]{1,120}$/;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const ID = /^[a-z][A-Za-z0-9-]{1,39}$/;

/** Um mod do formato antigo (`kind` e o id do motor, ou o mod pronto) como um
 * mod genérico, como o app o lê. */
function fromLegacy(mod: Record<string, unknown>): ModManifest | null {
  const id = mod.id as string;
  const contributes: ModContributions | null = mod.kind === "llm" ? { llmEngines: [id] }
    : mod.kind === "feature" ? { features: [id] }
    : mod.kind === "template" && isObject(mod.template) ? { agents: [mod.template as ModAgent] }
    : null;
  if (!contributes) return null;
  const preinstalled = mod.kind === "llm" || (mod.kind === "feature" && mod.defaultOn !== false);
  const { kind: _kind, defaultOn: _defaultOn, template: _template, ...rest } = mod;
  return { ...(rest as Omit<ModManifest, "contributes">), preinstalled, contributes };
}

/** O catálogo como desceu, só com o que o site sabe mostrar: um dos dois
 * formatos e os mods com id, textos e o que trazem; o antigo vira o genérico.
 * Nulo quando nem isso dá para ler. */
export function readCatalog(value: unknown): Catalog | null {
  if (!isObject(value)) return null;
  const { schema, mods } = value as { schema?: unknown; mods?: unknown };
  if ((schema !== CATALOG_SCHEMA && schema !== LEGACY_SCHEMA) || !Array.isArray(mods)) return null;
  const seen = new Set<string>();
  const kept: ModManifest[] = [];
  for (const mod of mods) {
    if (!isObject(mod) || typeof mod.id !== "string" || !ID.test(mod.id) || !isObject(mod.title) || !isObject(mod.summary)) continue;
    const manifest = schema === CATALOG_SCHEMA ? (isObject(mod.contributes) && Object.keys(mod.contributes).length > 0 ? mod as unknown as ModManifest : null) : fromLegacy(mod);
    if (!manifest || seen.has(manifest.id)) continue;
    seen.add(manifest.id);
    kept.push(manifest);
  }
  return { schema: CATALOG_SCHEMA, mods: kept };
}

/** Os pontos que o mod usa. */
export const pointsOf = (manifest: ModManifest) => Object.keys(manifest.contributes ?? {});

/** Os agentes que o mod traz. */
export const modAgents = (manifest: ModManifest): ModAgent[] => (Array.isArray(manifest.contributes?.agents) ? manifest.contributes.agents : []);

/** O id do agente que a entrada `index` do mod vira: o mesmo do app. */
export const modAgentId = (modId: string, index: number) => (index === 0 ? `${CUSTOM_PREFIX}${modId}` : `${CUSTOM_PREFIX}${modId}-${index + 1}`);

/** Os ids de agente que os mods do catálogo usam: um mod criado aqui não pode
 * ficar com nenhum deles. */
export const reservedAgentIds = (catalog: Catalog | null) => (catalog?.mods ?? []).flatMap((manifest) => modAgents(manifest).map((_agent, index) => modAgentId(manifest.id, index)));

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

/** O ambiente pedido pela página: o pessoal ou o id de uma organização. */
export function environmentOk(value: string): boolean {
  return value === "personal" || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
}
