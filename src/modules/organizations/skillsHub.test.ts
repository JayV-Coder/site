import { describe, expect, it } from "vitest";
import { parseSkillFile } from "./extensions";
import { fetchSkillFile, GITHUB_TREE, parseHits, rawUrl, searchHub, skillDirs, SKILLS_SEARCH, validSource, type Fetcher } from "./skillsHub";

const page = (body: string, ok = true): Awaited<ReturnType<Fetcher>> => ({ ok, status: ok ? 200 : 404, text: async () => body });
const fake = (pages: Record<string, string>): Fetcher => async (url) => (url in pages ? page(pages[url]) : page("", false));
const skill = (name: string) => `---\nname: ${name}\ndescription: Does ${name}.\n---\nSteps for ${name}`;
const header = (text: string) => parseSkillFile(text)?.name ?? null;

describe("skills.sh", () => {
  it("fica só com o que dá para instalar", () => {
    const hits = parseHits({ skills: [{ id: "acme/skills/pdf", name: "pdf", installs: 1200, source: "acme/skills" }, { id: "x/y/z", installs: 3 }, { id: "bad", name: "a b", source: "../etc" }, { name: "dotted.name", source: "a/b" }] });
    expect(hits.map((hit) => [hit.source, hit.name, hit.installs])).toEqual([["acme/skills", "pdf", 1200], ["x/y", "z", 3]]);
    expect(parseHits("nada")).toEqual([]);
    expect(validSource("../x")).toBeNull();
    expect(validSource("a/b/c")).toBeNull();
    expect(validSource("a/b.c")).toEqual(["a", "b.c"]);
  });

  it("busca curta não vai à rede e a longa pede ao skills.sh", async () => {
    const never: Fetcher = async () => { throw new Error("rede"); };
    expect(await searchHub("a", never)).toEqual([]);
    const hits = await searchHub("pdf forms", fake({ [`${SKILLS_SEARCH}?q=pdf%20forms&limit=20`]: JSON.stringify({ skills: [{ id: "acme/skills/pdf", name: "pdf", source: "acme/skills", installs: 5 }] }) }));
    expect(hits).toHaveLength(1);
  });

  const tree = JSON.stringify({ tree: [
    { path: "skills/pdf/SKILL.md", type: "blob" }, { path: "skills/other/SKILL.md", type: "blob" },
    { path: "docs/renamed/SKILL.md", type: "blob" }, { path: "skills/pdf/node_modules/x/SKILL.md", type: "blob" },
  ] });
  const pages = {
    [`${GITHUB_TREE}/acme/skills/git/trees/HEAD?recursive=1`]: tree,
    [rawUrl("acme", "skills", "skills/pdf/SKILL.md")]: skill("pdf"),
    [rawUrl("acme", "skills", "skills/other/SKILL.md")]: skill("other"),
    [rawUrl("acme", "skills", "docs/renamed/SKILL.md")]: skill("nice-name"),
  };

  it("acha a pasta pelo nome e ignora dependências", () => {
    expect(skillDirs(JSON.parse(tree).tree, "pdf")[0]).toBe("skills/pdf");
    expect(skillDirs(JSON.parse(tree).tree, "pdf")).not.toContain("skills/pdf/node_modules/x");
  });

  it("baixa o SKILL.md da pasta certa, também quando o nome está só no cabeçalho", async () => {
    expect(await fetchSkillFile("acme/skills", "pdf", fake(pages), header)).toContain("Steps for pdf");
    expect(await fetchSkillFile("acme/skills", "nice-name", fake(pages), header)).toContain("nice-name");
  });

  it("recusa skill que não existe e endereço fora do formato", async () => {
    expect(await fetchSkillFile("acme/skills", "missing", fake(pages), header)).toBeNull();
    expect(await fetchSkillFile("../skills", "pdf", fake(pages), header)).toBeNull();
    expect(await fetchSkillFile("acme/skills", "../pdf", fake(pages), header)).toBeNull();
  });
});
