import { describe, expect, it } from "vitest";
import { looksLikeLocale, pickLocale, render } from "./render";

describe("render", () => {
  it("falls back to the built-in English and fills the marks", () => {
    expect(render("pt-BR", {}, "site.hero.release", { version: "1.2.3" })).toBe("Version 1.2.3 · Windows, macOS and Linux");
    expect(render("pt-BR", { "site.hero.release": "Versão {version}" }, "site.hero.release", { version: "1.2.3" })).toBe("Versão 1.2.3");
  });

  it("picks the plural form of the locale", () => {
    expect(render("en", {}, "admin.plan.subscribers", { count: 1 })).toBe("1 subscriber");
    expect(render("en", {}, "admin.plan.subscribers", { count: 3 })).toBe("3 subscribers");
  });
});

describe("pickLocale", () => {
  const available = ["pt-BR", "en", "es", "zh-CN"];

  it("prefers the saved choice, then the browser, then English", () => {
    expect(pickLocale(available, "es", "pt-BR")).toBe("es");
    expect(pickLocale(available, undefined, "pt-PT,pt;q=0.9,en;q=0.8")).toBe("pt-BR");
    expect(pickLocale(available, undefined, "zh-TW")).toBe("zh-CN");
    expect(pickLocale(available, "xx", "ko")).toBe("en");
  });

  it("recognizes locale segments", () => {
    expect(looksLikeLocale("pt-BR")).toBe(true);
    expect(looksLikeLocale("ja")).toBe(true);
    expect(looksLikeLocale("admin")).toBe(false);
  });
});
