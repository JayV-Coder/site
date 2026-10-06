/** As permissões de comandos da organização: o que os agentes nunca rodam nos
 * projetos dela. Cada regra é o programa e até dois subcomandos (`git`,
 * `git push`); bloquear o programa bloqueia todos os subcomandos. É o mesmo
 * formato de `set_command_rules` e o app (`src/modules/organizations/commands.ts`
 * do jayv-coder) lê a mesma lista. */

/** O catálogo do seletor: o programa e os subcomandos que mais pesam. O que
 * não está aqui se escreve à mão, uma regra por linha. */
export const COMMAND_CATALOG: { tool: string; subcommands: string[] }[] = [
  { tool: "git", subcommands: ["status", "diff", "log", "show", "branch", "checkout", "switch", "add", "commit", "restore", "reset", "stash", "merge", "rebase", "cherry-pick", "tag", "fetch", "pull", "push", "clone", "remote", "clean"] },
  { tool: "npm", subcommands: ["install", "ci", "run", "test", "publish", "uninstall", "update", "exec"] },
  { tool: "pnpm", subcommands: ["install", "add", "remove", "run", "test", "publish", "update", "dlx"] },
  { tool: "yarn", subcommands: ["install", "add", "remove", "run", "test", "publish", "upgrade"] },
  { tool: "pip", subcommands: ["install", "uninstall", "download"] },
  { tool: "cargo", subcommands: ["build", "test", "run", "install", "publish", "add", "update"] },
  { tool: "go", subcommands: ["build", "test", "run", "get", "install", "mod"] },
  { tool: "docker", subcommands: ["run", "build", "compose", "push", "pull", "rm", "exec"] },
  { tool: "kubectl", subcommands: ["get", "apply", "delete", "exec"] },
  { tool: "gh", subcommands: ["pr", "issue", "release", "repo", "api"] },
  { tool: "terraform", subcommands: ["plan", "apply", "destroy"] },
  { tool: "make", subcommands: [] },
  { tool: "curl", subcommands: [] },
  { tool: "wget", subcommands: [] },
  { tool: "ssh", subcommands: [] },
  { tool: "sudo", subcommands: [] },
  { tool: "rm", subcommands: [] },
];

/** O mesmo `check` de `command_rules_ok`. */
export const COMMAND_RULE = /^[A-Za-z0-9._+][A-Za-z0-9._+@/:-]{0,39}( [A-Za-z0-9._+][A-Za-z0-9._+@/:-]{0,39}){0,2}$/;
export const COMMAND_RULES_MAX = 200;

/** As linhas de um campo de texto, aparadas, sem vazias e sem repetição. */
export function ruleLines(text: string): string[] {
  return [...new Set(text.split("\n").map((line) => line.trim()).filter(Boolean))];
}

/** O que o banco recusaria, antes de enviar. */
export function rulesInvalid(rules: string[]): boolean {
  return rules.length > COMMAND_RULES_MAX || rules.some((rule) => !COMMAND_RULE.test(rule));
}

/** A regra bloqueia o comando quando as palavras dela são o começo das dele. */
export function ruleBlocks(rule: string, command: string): boolean {
  const mine = rule.split(/\s+/);
  const theirs = command.trim().split(/\s+/);
  return mine.length <= theirs.length && mine.every((word, index) => word === theirs[index]);
}

/** As regras que o catálogo sabe mostrar (o programa ou `programa subcomando`). */
export function inCatalog(rule: string): boolean {
  const [tool, sub, ...rest] = rule.split(" ");
  const entry = COMMAND_CATALOG.find((item) => item.tool === tool);
  return !!entry && rest.length === 0 && (sub === undefined || entry.subcommands.includes(sub));
}

/** As regras gravadas de um escopo: da organização (`repositoryId` nulo) ou de um repositório. */
export interface StoredCommandRules { repositoryId: string | null; blocked: string[] }

/** Uma linha de `organization_command_rules` como o supabase-js a devolve. */
export function storedCommandRules(row: Record<string, unknown>): StoredCommandRules {
  return {
    repositoryId: (row.repository_id as string | null) ?? null,
    blocked: Array.isArray(row.blocked) ? row.blocked.map(String) : [],
  };
}
