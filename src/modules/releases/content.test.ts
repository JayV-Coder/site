import { describe, expect, it } from "vitest";
import { byCategory, categoryOf } from "./content";

describe("categorias da documentação", () => {
  it("mods têm a sua seção, logo depois de agentes e modelos", () => {
    const groups = byCategory([
      { category: "gate" }, { category: "mods" }, { category: "agents" }, { category: "chat" },
    ]);
    expect(groups.map((group) => group.category)).toEqual(["chat", "agents", "mods", "gate"]);
  });

  it("categoria que o site não conhece cai em outras", () => {
    expect(categoryOf("mods")).toBe("mods");
    expect(categoryOf("futuro")).toBe("other");
  });
});
