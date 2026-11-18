import { describe, expect, it } from "vitest";
import { checkStatus, profileChangeKeys, profileOptions, reindexProgress, retentionValid, shortDate } from "./privacy";

describe("privacidade", () => {
  it("mostra o perfil dedicado ou local só quando já está ligado", () => {
    expect(profileOptions("standard")).toEqual(["standard", "br_region"]);
    expect(profileOptions("dedicated")).toEqual(["dedicated", "standard", "br_region"]);
    expect(profileOptions("local")).toEqual(["local", "standard", "br_region"]);
  });

  it("aceita só dias inteiros dentro dos limites", () => {
    const limits = { min_days: 7, max_days: 365 };
    expect(retentionValid(7, limits)).toBe(true);
    expect(retentionValid(365, limits)).toBe(true);
    expect(retentionValid(6, limits)).toBe(false);
    expect(retentionValid(366, limits)).toBe(false);
    expect(retentionValid(30.5, limits)).toBe(false);
    expect(retentionValid(Number.NaN, limits)).toBe(false);
  });

  it("avisa o que muda ao sair do dedicado ou do local", () => {
    expect(profileChangeKeys("standard", "br_region")).toEqual(["site.doctor.privacy.change.brazil", "site.doctor.privacy.change.reindex"]);
    expect(profileChangeKeys("dedicated", "standard")).toContain("site.doctor.privacy.change.leaveDedicated");
    expect(profileChangeKeys("local", "standard")).toContain("site.doctor.privacy.change.leaveLocal");
  });

  it("só mostra a reindexação enquanto ela não terminou", () => {
    expect(reindexProgress({ total: 0, current: 0 })).toBeNull();
    expect(reindexProgress({ total: 10, current: 10 })).toBeNull();
    expect(reindexProgress({ total: 10, current: 4 })).toEqual({ current: 4, total: 10 });
  });

  it("separa divergência de região de falha da verificação", () => {
    const base = { checked_at: "2026-11-17T10:00:00Z", region: "southamerica-east1", detail: "x" };
    expect(checkStatus(null)).toBeNull();
    expect(checkStatus({ ...base, ok: true, in_region: true })?.ok).toBe(true);
    expect(checkStatus({ ...base, ok: false, in_region: false })?.key).toBe("site.doctor.privacy.check.diverged");
    expect(checkStatus({ ...base, ok: false, in_region: true })?.key).toBe("site.doctor.privacy.check.noAnswer");
  });

  it("formata a data em UTC", () => {
    expect(shortDate("en-US", "2026-11-17T23:30:00Z")).toBe("11/17/26");
  });
});
