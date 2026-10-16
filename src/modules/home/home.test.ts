import { describe, expect, it } from "vitest";
import type { ModPage } from "@/modules/mods/pages";
import type { Catalog, ModManifest } from "@/modules/mods/rules";
import type { ChangeRelease, Manual, ManualFeature } from "@/modules/releases/content";
import { GRID, RELEASE_SHOTS, currentRelease, findPicture, gridCells, highlights, shotUrl, spotlight, worksWith } from ".";

const page = (enable: string | null, steps: string[] = []): ModPage => ({
  version: "1.0.0",
  about: { en: "About" },
  requirements: null,
  enable: enable ? { name: enable, locales: ["en", "pt-BR"], v: "abc" } : null,
  setup: [],
  use: steps.map((name) => ({ text: { en: name }, image: { name, locales: ["en"], v: "" } })),
});

const feature = (id: string, since: string | null = null): ManualFeature => ({ id, category: "chat", since, plan: null, commands: [], title: id, summary: `${id} summary`, usage: "" });

const manifest = (id: string, contributes: ModManifest["contributes"], required = false): ModManifest => ({ id, category: "x", plan: null, required, title: { en: id }, summary: { en: id }, contributes });

describe("the prints of the home page", () => {
  it("finds the enable print or the one of a step, by name", () => {
    expect(findPicture(page("enable", ["chat"]), "enable")?.name).toBe("enable");
    expect(findPicture(page("enable", ["chat", "settings"]), "settings")?.name).toBe("settings");
    expect(findPicture(page(null, ["chat"]), "enable")).toBeNull();
    expect(findPicture(undefined, "chat")).toBeNull();
  });

  it("builds the address in the page language, and nothing without the page", () => {
    const pages = { claude: page("enable", ["chat"]) };
    expect(shotUrl(pages, { mod: "claude", name: "enable" }, "pt-BR")).toMatch(/\/media\/claude\/enable\.pt-BR\.webp\?v=abc$/);
    // Sem o idioma, o inglês.
    expect(shotUrl(pages, { mod: "claude", name: "chat" }, "ja")).toMatch(/\/media\/claude\/chat\.en\.webp$/);
    expect(shotUrl(pages, { mod: "codex", name: "chat" }, "en")).toBeNull();
    expect(shotUrl(null, { mod: "claude", name: "chat" }, "en")).toBeNull();
  });
});

describe("what's new on the home page", () => {
  const releases: ChangeRelease[] = [
    { version: "0.106.0", date: "2026-10-20", items: [{ kind: "fix", id: "someFix", title: "A fix", detail: null }] },
    { version: "0.105.0", date: "2026-10-16", items: [
      { kind: "fix", id: "aFix", title: "Fix", detail: null },
      { kind: "feature", id: "plainFeature", title: "Plain", detail: "No screen" },
      { kind: "feature", id: "onlyEssentials", title: "Only essentials", detail: "Detail" },
    ] },
  ];

  it("presents the published version, or the newest of the changelog", () => {
    expect(currentRelease(releases, "0.105.0")?.version).toBe("0.105.0");
    expect(currentRelease(releases, "9.9.9")?.version).toBe("0.106.0");
    expect(currentRelease(releases, null)?.version).toBe("0.106.0");
    expect(currentRelease(null, "0.105.0")).toBeNull();
  });

  it("shows the features of the version, or its fixes when it has none", () => {
    expect(highlights(releases[1]).map((item) => item.id)).toEqual(["plainFeature", "onlyEssentials"]);
    expect(highlights(releases[0]).map((item) => item.id)).toEqual(["someFix"]);
    expect(highlights(null)).toEqual([]);
  });

  it("puts in the band the first item with a screen, with the catalog button for mods", () => {
    expect(RELEASE_SHOTS.onlyEssentials).toBeDefined();
    expect(spotlight(releases[1])).toEqual({ item: releases[1].items[2], shot: RELEASE_SHOTS.onlyEssentials, mods: true });
    // Nenhum item com print: o primeiro, só com texto.
    expect(spotlight(releases[0])).toEqual({ item: releases[0].items[0], shot: null, mods: false });
    expect(spotlight(null)).toBeNull();
  });
});

describe("the feature grid", () => {
  it("keeps the grid order, skips what the manual lacks and marks what is new", () => {
    const manual: Manual = { version: "0.105.0", updatedAt: null, commands: [], features: [feature("modCatalog", "0.105.0"), feature("entryGate", "0.40.0"), feature("other")] };
    const cells = gridCells(manual, "0.105.0");
    expect(cells.map((cell) => cell.id)).toEqual(["entryGate", "modCatalog"]);
    expect(cells.map((cell) => cell.isNew)).toEqual([false, true]);
    expect(cells[1].action).toEqual({ kind: "catalog" });
    expect(gridCells(null, "0.105.0")).toEqual([]);
  });

  it("has nine cells, the last row with an action each", () => {
    expect(GRID).toHaveLength(9);
    expect(GRID.slice(6).every((cell) => cell.action)).toBe(true);
    expect(GRID.slice(0, 6).some((cell) => cell.action)).toBe(false);
  });
});

describe("works with", () => {
  it("lists the LLM engines and the agents of the catalog, never the essentials", () => {
    const catalog: Catalog = { schema: 2, mods: [
      manifest("claude", { llmEngines: ["claude"] }),
      manifest("stats", { features: ["stats"] }, true),
      manifest("ollama", { agents: [{ kind: "api", protocol: "openai", baseUrl: "http://127.0.0.1:11434/v1", keyRequired: false }] }),
      manifest("rea", { skills: [{ name: "rea", description: "d", instructions: "i" }] }),
      manifest("core", { llmEngines: ["core"] }, true),
    ] };
    expect(worksWith(catalog).map((mod) => mod.id)).toEqual(["claude", "ollama"]);
    expect(worksWith(null)).toEqual([]);
  });
});
