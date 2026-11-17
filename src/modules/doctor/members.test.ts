import { describe, expect, it } from "vitest";
import { daysLeft, inviteRoles, isLocked } from "./members";

describe("membros e convites", () => {
  it("só o Owner convida outro Owner", () => {
    expect(inviteRoles("admin")).toEqual(["analyst", "viewer", "admin"]);
    expect(inviteRoles("owner")).toEqual(["analyst", "viewer", "admin", "owner"]);
  });

  it("conta os dias do convite para cima, e zero é expirado", () => {
    const now = new Date("2026-11-17T12:00:00Z");
    expect(daysLeft("2026-11-24T12:00:00Z", now)).toBe(7);
    expect(daysLeft("2026-11-17T18:00:00Z", now)).toBe(1);
    expect(daysLeft("2026-11-17T12:00:00Z", now)).toBe(0);
    expect(daysLeft("2026-11-10T12:00:00Z", now)).toBeLessThan(0);
  });

  it("Admin não mexe em Owner", () => {
    expect(isLocked("owner", "admin")).toBe(true);
    expect(isLocked("owner", "owner")).toBe(false);
    expect(isLocked("viewer", "admin")).toBe(false);
  });
});
