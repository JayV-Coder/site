import { describe, expect, it } from "vitest";
import type { Catalog, ModManifest } from "./rules";
import { activeMods, changed, effectiveState, legacyStates, readLegacy, readState } from "./state";

const texts = (en: string) => ({ en });
const mod = (id: string, contributes: ModManifest["contributes"], patch: Partial<ModManifest> = {}): ModManifest =>
  ({ id, version: "1.0.0", category: "project", plan: null, title: texts(id), summary: texts("."), contributes, ...patch });
const CATALOG: Catalog = { schema: 2, mods: [
  mod("claude", { llmEngines: ["claude"] }, { preinstalled: true }),
  mod("stats", { features: ["stats"] }, { preinstalled: true }),
  mod("mcp", { features: ["mcp"] }, { preinstalled: true }),
  mod("review-kit", { features: ["mcp"], agents: [{ kind: "api", protocol: "openai", baseUrl: "http://localhost:8080/v1", keyRequired: false }] }, { requires: ["stats"] }),
] };
const on = (state: { mods: Record<string, { enabled: boolean }> }) => Object.fromEntries(Object.entries(state.mods).map(([id, item]) => [id, item.enabled]));
const NOW = "2026-10-12T20:00:00Z";

describe("the mods of an environment", () => {
  it("reads what the app saved and ignores what it can't", () => {
    expect(readState(JSON.stringify({ mods: { stats: { enabled: false, version: "1.0.0" }, "Bad id": { enabled: true }, mcp: { enabled: "yes" } }, removed: ["claude", "stats", 3] })))
      .toEqual({ mods: { stats: { enabled: false, version: "1.0.0" } }, removed: ["claude"] });
    expect(readState("[1]")).toBeNull();
    expect(readState(undefined)).toBeNull();
    expect(readLegacy('{"stats":false,"x":1}')).toEqual({ stats: false });
  });

  it("counts the preinstalled mods until someone decides, like the app", () => {
    expect(on(effectiveState(null, CATALOG, {}))).toEqual({ claude: true, stats: true, mcp: true });
    expect(on(effectiveState(null, CATALOG, { stats: false }))).toEqual({ stats: false, claude: true, mcp: true });
    expect(on(effectiveState({ mods: {}, removed: ["claude"] }, CATALOG, { stats: false }))).toEqual({ stats: true, mcp: true });
  });

  it("installs with the requirements and remembers a removed preinstalled mod", () => {
    const start = effectiveState({ mods: { claude: { enabled: true } }, removed: ["stats", "mcp"] }, CATALOG, {});
    const installed = changed(start, CATALOG, { id: "review-kit", action: "install" }, NOW)!;
    expect(on(installed)).toEqual({ claude: true, "review-kit": true, stats: true });
    expect(installed.mods["review-kit"]).toEqual({ enabled: true, version: "1.0.0", installedAt: NOW });
    expect(installed.removed).toEqual(["mcp"]);
    const gone = changed(installed, CATALOG, { id: "claude", action: "uninstall" }, NOW)!;
    expect(gone.removed).toEqual(["mcp", "claude"]);
    expect(changed(gone, CATALOG, { id: "claude", action: "disable" }, NOW)).toBeNull();
    expect(changed(gone, CATALOG, { id: "ghost", action: "install" }, NOW)).toBeNull();
    expect(on(changed(gone, CATALOG, { id: "stats", action: "disable" }, NOW)!)).toEqual({ "review-kit": true, stats: false });
  });

  it("knows what is active and writes the line of the old app", () => {
    const state = { mods: { claude: { enabled: true }, stats: { enabled: false }, "review-kit": { enabled: true } }, removed: [] };
    expect([...activeMods(state, CATALOG)]).toEqual(["claude"]);
    expect(legacyStates(state, CATALOG)).toEqual({ claude: true, stats: false, mcp: false });
    const all = { ...state, mods: { ...state.mods, stats: { enabled: true } } };
    expect(legacyStates(all, CATALOG)).toEqual({ claude: true, stats: true, mcp: true });
  });
});
