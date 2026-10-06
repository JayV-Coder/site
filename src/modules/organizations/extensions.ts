/** Os servidores MCP e as skills que a organização dá aos membros. Os formatos
 * são os do app (`McpServer` e `SKILL.md`): o que se grava aqui desce para o
 * app de cada membro como está. As RPCs conferem tudo de novo. */

export type McpTransport = "stdio" | "http";

/** Todos os agentes recebem os servidores, cada um do jeito que sabe (e só
 * com o "Aprovar servidores MCP" dele ligado no app). */
export const MCP_AGENTS = ["claude", "codex", "copilot", "cursor", "kilo", "openrouter", "litellm"] as const;
export type McpAgent = (typeof MCP_AGENTS)[number];

export interface OrgMcpServer {
  name: string;
  transport: McpTransport;
  command: string;
  args: string[];
  env: Record<string, string>;
  url: string;
  headers: Record<string, string>;
  /** Vazio é todos os agentes que sabem receber. */
  agents: string[];
  enabled: boolean;
}

export interface OrgSkill { name: string; description: string; body: string; enabled: boolean }

export const MCP_NAME_MAX = 40;
export const SKILL_NAME_MAX = 64;
export const SKILL_DESCRIPTION_MAX = 1024;
export const SKILL_BODY_MAX = 100_000;

export const blankServer = (): OrgMcpServer => ({ name: "", transport: "stdio", command: "", args: [], env: {}, url: "", headers: {}, agents: [], enabled: true });

/** As linhas de um campo de texto: aparadas e sem as vazias. */
export const textLines = (text: string) => text.split("\n").map((line) => line.trim()).filter(Boolean);

/** `CHAVE=valor`, uma por linha; a linha sem `=` é ignorada. */
export function parsePairs(text: string, separator: "=" | ":"): Record<string, string> {
  const pairs: Record<string, string> = {};
  for (const line of textLines(text)) {
    const at = line.indexOf(separator);
    if (at <= 0) continue;
    pairs[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return pairs;
}

export const pairsText = (pairs: Record<string, string>, separator: "=" | ":") =>
  Object.entries(pairs).map(([key, value]) => `${key}${separator === ":" ? ": " : "="}${value}`).join("\n");

export type McpProblem = "name" | "command" | "url" | "env";

/** O que impede de gravar o servidor; vazio quando está certo. */
export function mcpProblems(server: OrgMcpServer): McpProblem[] {
  const problems: McpProblem[] = [];
  if (!/^[A-Za-z0-9_-]+$/.test(server.name) || server.name.length > MCP_NAME_MAX || server.name === "jayv") problems.push("name");
  if (server.transport === "stdio" && !server.command.trim()) problems.push("command");
  if (server.transport === "http" && !/^https?:\/\//.test(server.url.trim())) problems.push("url");
  if (server.transport === "stdio" && Object.keys(server.env).some((key) => !/^[A-Za-z0-9_]+$/.test(key))) problems.push("env");
  return problems;
}

/** O servidor limpo, como o banco o guarda (camelCase, igual ao do app): só o
 * que o transporte usa. */
export function mcpPayload(server: OrgMcpServer) {
  const stdio = server.transport === "stdio";
  return {
    name: server.name.trim(),
    transport: server.transport,
    command: stdio ? server.command.trim() : "",
    args: stdio ? server.args.map((arg) => arg.trim()).filter(Boolean) : [],
    env: stdio ? server.env : {},
    url: stdio ? "" : server.url.trim(),
    headers: stdio ? {} : server.headers,
    agents: server.agents.filter((agent) => (MCP_AGENTS as readonly string[]).includes(agent)),
    enabled: true,
  };
}

const record = (value: unknown): Record<string, string> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, typeof item === "string" ? item : JSON.stringify(item)]))
    : {};
const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);

function serverFrom(name: string, entry: unknown): OrgMcpServer | null {
  if (!entry || typeof entry !== "object") return null;
  const data = entry as Record<string, unknown>;
  const url = typeof data.url === "string" ? data.url : "";
  const command = typeof data.command === "string" ? data.command : "";
  if (!url && !command) return null;
  const clean = name.trim().replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, MCP_NAME_MAX);
  return url
    ? { ...blankServer(), name: clean, transport: "http", url, headers: record(data.headers) }
    : { ...blankServer(), name: clean, transport: "stdio", command, args: strings(data.args), env: record(data.env) };
}

/** Lê a configuração colada: `mcpServers` do Claude Desktop e do Cursor, a
 * `servers` do VS Code ou um servidor sozinho. Vazio quando não é nada disso. */
export function parseMcpJson(text: string): OrgMcpServer[] {
  let value: unknown;
  try {
    value = JSON.parse(text.trim().replace(/^```(?:json)?/, "").replace(/```$/, "").trim());
  } catch {
    return [];
  }
  if (!value || typeof value !== "object") return [];
  const data = value as Record<string, unknown>;
  const map = (data.mcpServers ?? data.servers) as unknown;
  if (map && typeof map === "object") {
    return Object.entries(map).flatMap(([name, entry]) => serverFrom(name, entry) ?? []);
  }
  if (typeof data.command === "string" || typeof data.url === "string") {
    const server = serverFrom(typeof data.name === "string" ? data.name : "server", data);
    return server ? [server] : [];
  }
  return [];
}

export type SkillProblem = "name" | "description" | "body";

/** Lê o `SKILL.md`: um cabeçalho entre duas linhas `---` com `name` e
 * `description` (numa linha só, entre aspas ou em bloco `>`/`|`) e, depois
 * dele, as instruções. Nulo quando o cabeçalho não existe. */
export function parseSkillFile(text: string): { name: string; description: string; body: string } | null {
  const source = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").trimStart();
  if (!source.startsWith("---\n")) return null;
  const rest = source.slice(4);
  const end = rest.indexOf("\n---");
  if (end < 0) return null;
  const header = rest.slice(0, end).split("\n");
  const after = rest.slice(end + 4);
  const body = (after.includes("\n") ? after.slice(after.indexOf("\n") + 1) : "").trim();
  const found = { name: "", description: "" };
  for (let index = 0; index < header.length; index += 1) {
    const line = header[index];
    const colon = line.indexOf(":");
    if (colon < 0 || /^\s/.test(line)) continue;
    const key = line.slice(0, colon).trim();
    if (key !== "name" && key !== "description") continue;
    let value = line.slice(colon + 1).trim();
    if (/^(['"]).*\1$/.test(value) && value.length >= 2) value = value.slice(1, -1);
    if (/^[>|][-+]?$/.test(value)) {
      const parts: string[] = [];
      while (index + 1 < header.length && (/^\s/.test(header[index + 1]) || !header[index + 1].trim())) {
        index += 1;
        if (header[index].trim()) parts.push(header[index].trim());
      }
      value = parts.join(" ");
    }
    found[key] = value;
  }
  return { name: found.name.trim(), description: found.description.split(/\s+/).filter(Boolean).join(" "), body };
}

export function skillProblems(skill: { name: string; description: string; body: string }): SkillProblem[] {
  const problems: SkillProblem[] = [];
  if (!/^[A-Za-z0-9_-]+$/.test(skill.name) || skill.name.length > SKILL_NAME_MAX) problems.push("name");
  if (!skill.description.trim() || skill.description.length > SKILL_DESCRIPTION_MAX) problems.push("description");
  if (!skill.body.trim() || skill.body.length > SKILL_BODY_MAX) problems.push("body");
  return problems;
}

/** O `SKILL.md` de uma skill gravada, para editar no mesmo formato em que ela entra. */
export const skillFile = (skill: { name: string; description: string; body: string }) =>
  `---\nname: ${skill.name}\ndescription: ${JSON.stringify(skill.description)}\n---\n${skill.body}\n`;
