import { describe, expect, it } from "vitest";
import { syncLink } from "./appLink";

describe("the link that wakes the app", () => {
  it("names the mod and the environment, and changes on every click", () => {
    expect(syncLink("ollama", "personal", 1)).toBe("jayv://mods/sync?mod=ollama&environment=personal&at=1");
    const url = new URL(syncLink("lm-studio", "0b6c1f3e-1d2a-4c5b-8e9f-123456789abc", 2));
    expect([url.protocol, url.host, url.pathname]).toEqual(["jayv:", "mods", "/sync"]);
    expect(url.searchParams.get("mod")).toBe("lm-studio");
    expect(syncLink("ollama", "personal", 1)).not.toBe(syncLink("ollama", "personal", 2));
  });
});
