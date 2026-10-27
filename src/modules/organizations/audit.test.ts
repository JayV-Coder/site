import { describe, expect, it } from "vitest";
import { auditCsv, auditRange, auditRowsOf, lastDays } from "./audit";

describe("audit log", () => {
  const rows = auditRowsOf([{
    at: "2026-10-27T10:00:00Z", turn_id: "t1", chat_id: "c1", user_id: "u1", member: "Ana, \"dev\"", project: "=HYPERLINK(1)",
    gate: "pass", agent: "claude", model: "sonnet", mode: "build", commands: ["npm test", "npm run lint"], tools: ["Bash"],
    validation: "passed", repairs: 1, tokens: "150", cost_usd: null, status: "answered",
  }, null]);

  it("reads the rows and skips junk", () => {
    expect(rows).toHaveLength(1);
    expect(rows[0].tokens).toBe(150);
    expect(rows[0].costUsd).toBeNull();
  });

  it("writes a CSV that spreadsheets read safely", () => {
    const [header, line] = auditCsv(rows).trim().split("\r\n");
    expect(header.startsWith("at,member,project,gate")).toBe(true);
    expect(line).toContain('"Ana, ""dev"""');
    expect(line).toContain("'=HYPERLINK(1)");
    expect(line).toContain("npm test | npm run lint");
  });

  it("accepts only a valid period up to a year", () => {
    expect(auditRange("2026-10-01", "2026-10-27")).toEqual({ from: "2026-10-01", to: "2026-10-27" });
    expect(auditRange("2026-10-27", "2026-10-01")).toBeNull();
    expect(auditRange("2025-01-01", "2026-10-27")).toBeNull();
    expect(auditRange("ontem", "2026-10-27")).toBeNull();
    expect(lastDays(30, new Date("2026-10-27T12:00:00Z"))).toEqual({ from: "2026-09-28", to: "2026-10-27" });
  });
});
