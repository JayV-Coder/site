import { describe, expect, it } from "vitest";
import {
  draftOf, draftProblems, EMPTY_DRAFT, environmentOk, joinLine, lineProblem, modAgentId, modId, modText, optionsOf, readCatalog, reservedAgentIds, splitLine, type ModManifest,
} from "./rules";

const texts = (en: string, pt?: string) => ({ en, ...(pt ? { "pt-BR": pt } : {}) });
const api = { kind: "api" as const, protocol: "openai" as const, baseUrl: "http://localhost:11434/v1", keyRequired: false, models: [] };
const ollama: ModManifest = {
  id: "ollama", version: "1.0.0", category: "agents", plan: "customMods", minApp: "0.94.0", preinstalled: true, title: texts("Ollama"), summary: texts("Local models."),
  contributes: { agents: [api] },
};

describe("the catalog", () => {
  it("reads the generic format and keeps only mods that bring something", () => {
    const catalog = readCatalog({ schema: 2, mods: [ollama, { id: "x" }, { id: "empty", title: texts("E"), summary: texts("E"), contributes: {} }, { ...ollama }, null] });
    expect(catalog?.mods.map((mod) => mod.id)).toEqual(["ollama"]);
    expect(readCatalog({ schema: 3, mods: [] })).toBeNull();
    expect(readCatalog("x")).toBeNull();
  });

  it("reads the old format as the generic one, like the app", () => {
    const catalog = readCatalog({ schema: 1, mods: [
      { id: "ollama", kind: "template", category: "agents", plan: "customMods", title: texts("Ollama"), summary: texts("Local."), template: api },
      { id: "stats", kind: "feature", defaultOn: false, category: "project", plan: "stats", title: texts("Statistics"), summary: texts("Charts.") },
      { id: "claude", kind: "llm", category: "agents", plan: null, title: texts("Claude Code"), summary: texts("Agent.") },
      { id: "copilot", kind: "llm", category: "agents", plan: null, title: texts("GitHub Copilot"), summary: texts("Agent.") },
      { id: "x", kind: "plugin", title: texts("X"), summary: texts("X") },
    ] });
    expect(catalog?.schema).toBe(2);
    // Dos motores, só os que o catálogo genérico também traz de fábrica.
    expect(catalog?.mods.map((mod) => [mod.id, mod.contributes, mod.preinstalled])).toEqual([
      ["ollama", { agents: [api] }, false], ["stats", { features: ["stats"] }, false], ["claude", { llmEngines: ["claude"] }, true],
      ["copilot", { llmEngines: ["copilot"] }, false],
    ]);
    expect(catalog?.mods[1]).not.toHaveProperty("kind");
  });

  it("keeps the icon only when it is an SVG that fits", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h16" stroke="currentColor"/></svg>`;
    const catalog = readCatalog({ schema: 2, mods: [
      { ...ollama, icon: ` ${svg}\n` }, { ...ollama, id: "png", icon: "data:image/png;base64,AAAA" }, { ...ollama, id: "huge", icon: `<svg>${"x".repeat(16_000)}</svg>` },
      { ...ollama, id: "number", icon: 7 },
    ] });
    expect(catalog?.mods.map((mod) => [mod.id, mod.icon])).toEqual([["ollama", svg], ["png", undefined], ["huge", undefined], ["number", undefined]]);
    expect(catalog?.mods[1]).not.toHaveProperty("icon");
  });

  it("names the agents of each mod like the app", () => {
    expect(modAgentId("local", 0)).toBe("mod-local");
    expect(modAgentId("local", 2)).toBe("mod-local-3");
    expect(reservedAgentIds({ schema: 2, mods: [ollama, { ...ollama, id: "pair", contributes: { agents: [api, api] } }] })).toEqual(["mod-ollama", "mod-pair", "mod-pair-2"]);
  });

  it("speaks the language of the page, the closest one or English", () => {
    expect(modText({ en: "Statistics", "pt-BR": "Estatísticas" }, "pt-BR")).toBe("Estatísticas");
    expect(modText({ en: "Statistics", "pt-BR": "Estatísticas" }, "pt-PT")).toBe("Estatísticas");
    expect(modText({ en: "Statistics" }, "ja")).toBe("Statistics");
    expect(modText(undefined, "en")).toBe("");
  });
});

describe("a mod created on the site", () => {
  it("splits and checks the command line like the app", () => {
    const args = splitLine(`run --model {model} --system "be brief" '{prompt}'`);
    expect(args).toEqual(["run", "--model", "{model}", "--system", "be brief", "{prompt}"]);
    expect(splitLine(joinLine(args))).toEqual(args);
    expect(lineProblem(["--model={model}", "{prompt}"])).toBeNull();
    expect(lineProblem(["--prompt={prompt}"])).toBe("mods.args.placeholder");
    expect(lineProblem(["a\nb"])).toBe("mods.args.invalid");
  });

  it("gets an id that repeats neither a mod of the environment nor a ready-made one", () => {
    expect(modId("Meu Modelo Local!", [])).toBe("mod-meu-modelo-local");
    expect(modId("Ollama", reservedAgentIds({ schema: 2, mods: [ollama] }))).toBe("mod-ollama-2");
    expect(modId("***", [])).toBe("mod-mod");
  });

  it("shows what the app would refuse", () => {
    expect(draftProblems({ ...EMPTY_DRAFT, name: "Writer", command: "my agent", args: "{effort}", edits: true })).toEqual({
      command: "mods.command.hint", args: "mods.args.placeholder", planArgs: "mods.planArgs.required",
    });
    expect(draftProblems({ ...EMPTY_DRAFT, kind: "api", name: "Proxy", baseUrl: "localhost", model: "a b" })).toEqual({ baseUrl: "site.mods.baseUrl.invalid", model: "site.mods.model.invalid" });
    expect(draftProblems({ ...EMPTY_DRAFT, name: "Writer", command: "writer", args: "--model {model} {prompt}", edits: true, planArgs: "--dry-run {prompt}" })).toEqual({});
  });

  it("writes the options the core reads and keeps what belongs to the computer", () => {
    const draft = { ...EMPTY_DRAFT, kind: "api" as const, name: " Proxy ", baseUrl: "http://localhost:8080/v1 ", keyRequired: true };
    expect(optionsOf(draft, { hasKey: true, approveMcps: true, mcp: [] })).toEqual({
      name: "Proxy", kind: "api", args: [], planArgs: [], edits: false, protocol: "openai", baseUrl: "http://localhost:8080/v1",
      keyRequired: true, hasKey: true, approveMcps: true, mcp: [],
    });
    expect(optionsOf({ ...draft, protocol: "anthropic" }, { approveMcps: true }).approveMcps).toBe(false);
    const cli = optionsOf({ ...EMPTY_DRAFT, name: "Writer", command: "writer", args: "--model {model} {prompt}" });
    expect(draftOf(cli, "writer")).toEqual({ ...EMPTY_DRAFT, name: "Writer", command: "writer", args: "--model {model} {prompt}" });
  });

  it("goes only to the personal environment or an organization id", () => {
    expect(environmentOk("personal")).toBe(true);
    expect(environmentOk("6f1c2b3a-1111-4222-8333-944455556666")).toBe(true);
    expect(environmentOk("acme")).toBe(false);
  });
});
