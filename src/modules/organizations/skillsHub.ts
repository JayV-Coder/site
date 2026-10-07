/** O skills.sh, o diretório aberto de skills: a busca é a mesma da CLI
 * (`GET https://skills.sh/api/search?q=…` → `{skills:[{id,name,installs,source}]}`)
 * e a instalação lê o `SKILL.md` do repositório do GitHub que o resultado
 * aponta (`source` = `dono/repo`). Como no app, o nome na tela é o do
 * cabeçalho do arquivo. A rede entra por `fetcher`, para os testes. */

export const SKILLS_SEARCH = "https://skills.sh/api/search";
export const GITHUB_TREE = "https://api.github.com/repos";
export const GITHUB_RAW = "https://raw.githubusercontent.com";
export const HUB_LIMIT = 20;
const CANDIDATES_MAX = 12;
const SKIPPED = [".git", "node_modules", "target"];

export interface SkillHit { id: string; name: string; source: string; installs: number }
export type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

/** `dono/repo` só com o que o GitHub aceita: o endereço montado é sempre o do repositório. */
export function validSource(source: string): [string, string] | null {
  const parts = source.split("/");
  const good = (part: string) => /^[A-Za-z0-9._-]{1,100}$/.test(part) && part !== "." && part !== "..";
  return parts.length === 2 && good(parts[0]) && good(parts[1]) ? [parts[0], parts[1]] : null;
}

/** O mesmo nome que o app aceita numa skill: letras, dígitos, `-` e `_`. */
export const validSkillName = (name: string) => /^[A-Za-z0-9_-]{1,64}$/.test(name);

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Só o que dá para instalar: `source` no formato `dono/repo` e nome válido
 * (o `name`, ou o último pedaço do `id`). */
export function parseHits(data: unknown): SkillHit[] {
  const list = Array.isArray(data) ? data : (data as { skills?: unknown } | null)?.skills;
  if (!Array.isArray(list)) return [];
  return list.flatMap((item): SkillHit[] => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const id = str(row.id);
    const source = str(row.source) || id.split("/").slice(0, -1).join("/");
    const name = str(row.name) || id.split("/").pop() || "";
    if (!validSource(source) || !validSkillName(name)) return [];
    return [{ id: id || `${source}/${name}`, name, source, installs: typeof row.installs === "number" ? row.installs : 0 }];
  });
}

export async function searchHub(query: string, fetcher: Fetcher): Promise<SkillHit[]> {
  const text = query.trim();
  if ([...text].length < 2) return [];
  const response = await fetcher(`${SKILLS_SEARCH}?q=${encodeURIComponent(text)}&limit=${HUB_LIMIT}`);
  if (!response.ok) throw new Error(`skills.sh ${response.status}`);
  try { return parseHits(JSON.parse(await response.text())); } catch { return []; }
}

interface TreeEntry { path: string; type: string }

/** As pastas com `SKILL.md` (a raiz é `""`), a que casa com o nome primeiro. */
export function skillDirs(tree: TreeEntry[], name: string): string[] {
  const dirs = tree.filter((entry) => entry.type === "blob").flatMap((entry) => {
    if (entry.path === "SKILL.md") return [""];
    return entry.path.endsWith("/SKILL.md") ? [entry.path.slice(0, -"/SKILL.md".length)] : [];
  }).filter((dir) => !dir.split("/").some((part) => SKIPPED.includes(part)));
  const rank = (dir: string) => { const leaf = dir.split("/").pop() ?? ""; return leaf === name ? 0 : leaf.toLowerCase() === name.toLowerCase() ? 1 : 2; };
  return [...new Set(dirs)].sort((a, b) => rank(a) - rank(b) || a.split("/").length - b.split("/").length || a.localeCompare(b));
}

export const rawUrl = (owner: string, repo: string, path: string) => `${GITHUB_RAW}/${owner}/${repo}/HEAD/${path.split("/").map(encodeURIComponent).join("/")}`;

/** O texto do `SKILL.md` da skill `name` no repositório `source`, ou nulo
 * quando ela não está lá. A pasta é a que tem o nome (ou o `name` do cabeçalho). */
export async function fetchSkillFile(source: string, name: string, fetcher: Fetcher, headerName: (text: string) => string | null): Promise<string | null> {
  const repo = validSource(source);
  if (!repo || !validSkillName(name)) return null;
  const [owner, project] = repo;
  const listing = await fetcher(`${GITHUB_TREE}/${owner}/${project}/git/trees/HEAD?recursive=1`);
  if (!listing.ok) throw new Error(`github ${listing.status}`);
  const tree = ((JSON.parse(await listing.text()) as { tree?: TreeEntry[] }).tree ?? []);
  for (const dir of skillDirs(tree, name).slice(0, CANDIDATES_MAX)) {
    const file = await fetcher(rawUrl(owner, project, dir ? `${dir}/SKILL.md` : "SKILL.md"));
    if (!file.ok) continue;
    const text = await file.text();
    const found = headerName(text);
    if (found === name || (found === null && (dir.split("/").pop() ?? "") === name)) return text;
  }
  return null;
}
