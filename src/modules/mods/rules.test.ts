import { describe, expect, it } from "vitest";
import {
  draftOf, draftOfTemplate, draftProblems, EMPTY_DRAFT, environmentOk, joinLine, lineProblem, modId, modText, optionsOf, readCatalog, splitLine, templateAgentId, type ModManifest,
} from "./rules";

const texts = (en: string, pt?: string) => ({ en, ...(pt ? { "pt-BR": pt } : {}) });
const ollama: ModManifest = {
  id: "ollama", kind: "template", category: "agents", plan: "customMods", minApp: "0.94.0", title: texts("Ollama"), summary: texts("Local models."),
  template: { kind: "api", protocol: "openai", baseUrl: "http://localhost:11434/v1", keyRequired: false, models: [] },
};

describe("the catalog", () => {
  it("keeps the mods the site can show and refuses another format", () => {
    const catalog = readCatalog({ schema: 1, mods: [ollama, { id: "x" }, { id: "stats", kind: "feature", title: texts("Statistics"), summary: texts("Charts.") }, null] });
    expect(catalog?.mods.map((mod) => mod.id)).toEqual(["ollama", "stats"]);
    expect(readCatalog({ schema: 2, mods: [] })).toBeNull();
    expect(readCatalog("x")).toBeNull();
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
    expect(modId("Ollama", [templateAgentId(ollama)])).toBe("mod-ollama-2");
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

  it("starts from a ready-made mod of the catalog", () => {
    expect(draftOfTemplate(ollama, "pt-BR")).toEqual({ ...EMPTY_DRAFT, name: "Ollama", kind: "api", baseUrl: "http://localhost:11434/v1" });
    expect(draftOfTemplate({ ...ollama, template: undefined }, "en")).toBeNull();
  });

  it("goes only to the personal environment or an organization id", () => {
    expect(environmentOk("personal")).toBe(true);
    expect(environmentOk("6f1c2b3a-1111-4222-8333-944455556666")).toBe(true);
    expect(environmentOk("acme")).toBe(false);
  });
});
