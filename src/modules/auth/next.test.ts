import { describe, expect, it } from "vitest";
import { landingPath, safeNext } from "./next";

describe("safeNext", () => {
  it("keeps paths of this site", () => {
    expect(safeNext("/pt-BR/admin", "/en")).toBe("/pt-BR/admin");
  });

  it("refuses other addresses", () => {
    expect(safeNext("//evil.test", "/en")).toBe("/en");
    expect(safeNext("https://evil.test", "/en")).toBe("/en");
    expect(safeNext("/\\evil.test", "/en")).toBe("/en");
    expect(safeNext(null, "/en")).toBe("/en");
  });
});

describe("landingPath", () => {
  it("lands on the dashboard of the locale", () => {
    expect(landingPath("pt-BR")).toBe("/pt-BR/dashboard");
  });
});
