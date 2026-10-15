import { describe, expect, it } from "vitest";
import { byKind, cardsOf, imageUrl, kindOf, matchesMod, modSkills, readPages } from "./pages";
import type { ModManifest } from "./rules";

const texts = (en: string) => ({ en, "pt-BR": `${en} (pt)` });
const mod = (id: string, contributes: ModManifest["contributes"], patch: Partial<ModManifest> = {}): ModManifest =>
  ({ id, version: "1.0.0", category: "agents", plan: null, title: texts(id), summary: texts(`${id}.`), contributes, ...patch });

describe("the pages of the mods", () => {
  it("keeps what the site can show and drops the rest", () => {
    const pages = readPages({
      schema: 1,
      pages: {
        rea: {
          version: "1.0.0", about: texts("Inspects programs."), requirements: { en: "Node.js 22.19" }, enable: { name: "enable", locales: ["en", "pt-BR", "bad locale!"], v: "abc123" },
          setup: [{ text: texts("Approve MCP servers."), image: { name: "settings", locales: ["en"], v: "1" } }, { text: {} }],
          use: [{ text: texts("Ask in a chat."), image: { name: "Bad Name", locales: ["en"] } }],
        },
        "Bad Id": { about: texts("x") },
        empty: { about: {} },
      },
    });
    expect(Object.keys(pages ?? {})).toEqual(["rea"]);
    const page = pages!.rea;
    expect(page.enable).toEqual({ name: "enable", locales: ["en", "pt-BR"], v: "abc123" });
    expect(page.setup).toHaveLength(1);
    expect(page.use[0].image).toBeNull();
    expect(page.requirements).toEqual({ en: "Node.js 22.19" });
    expect(readPages({ schema: 2, pages: {} })).toBeNull();
  });

  it("shows the print in the language of the page, or in English", () => {
    const picture = { name: "chat", locales: ["en", "pt-BR"], v: "f00" };
    expect(imageUrl("rea", picture, "pt-BR")).toMatch(/\/media\/rea\/chat\.pt-BR\.webp\?v=f00$/);
    expect(imageUrl("rea", picture, "pt-PT")).toMatch(/chat\.pt-BR\.webp/);
    expect(imageUrl("rea", picture, "ja")).toMatch(/chat\.en\.webp/);
  });

  it("names the kind of each mod and the skills Jev can pick", () => {
    const rea = mod("rea", { skills: [{ name: "reverse-engineering", description: "d", instructions: "i", mcpServers: [{ name: "rea" }] }] });
    expect(kindOf(rea)).toBe("skills");
    expect(kindOf(mod("claude", { llmEngines: ["claude"] }))).toBe("llmEngines");
    expect(kindOf(mod("stats", { features: ["stats"] }))).toBe("features");
    expect(kindOf(mod("pack", { features: ["stats"], agents: [] }))).toBe("agents");
    expect(kindOf(mod("future", { themes: ["dark"] }))).toBe("other");
    expect(modSkills(rea)).toEqual([{ name: "reverse-engineering", servers: ["rea"] }]);
  });

  it("finds a mod by any word of its texts, in the language of the page", () => {
    const catalog = { schema: 2, mods: [mod("rea", { skills: [] }, { required: false, preinstalled: true, author: "JayV" }), mod("stats", { features: ["stats"] }, { required: true, plan: "stats" })] };
    const cards = cardsOf(catalog, readPages({ schema: 1, pages: { rea: { about: texts("Reverse engineering of binaries.") } } }), "pt-BR");
    expect(cards[0]).toMatchObject({ id: "rea", about: "Reverse engineering of binaries. (pt)", preinstalled: true, required: false, kind: "skills" });
    expect(cards[1]).toMatchObject({ required: true, preinstalled: true, plan: true, about: "" });
    const fields = (card: (typeof cards)[number]) => [card.title, card.summary, card.about, card.id, card.author];
    expect(cards.filter((card) => matchesMod("binaries reverse", fields(card))).map((card) => card.id)).toEqual(["rea"]);
    expect(cards.filter((card) => matchesMod("  ", fields(card)))).toHaveLength(2);
  });

  it("separates the mods by kind, in the order of the app, without empty kinds", () => {
    const catalog = { schema: 2, mods: [mod("stats", { features: ["stats"] }), mod("rea", { skills: [] }), mod("claude", { llmEngines: ["claude"] }), mod("lens", { features: ["mcp"] })] };
    const groups = byKind(cardsOf(catalog, null, "en"));
    expect(groups.map((group) => [group.kind, group.cards.map((card) => card.id)])).toEqual([["llmEngines", ["claude"]], ["skills", ["rea"]], ["features", ["stats", "lens"]]]);
  });
});
