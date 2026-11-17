import { describe, expect, it } from "vitest";
import { canRequireSso, groupRows, groupsPayload, normalizeDomain, ssoState, validDomain, validMetadataUrl } from "./sso";

describe("SSO da Organização", () => {
  it("o estado da conexão, para o selo", () => {
    expect(ssoState(null)).toEqual({ key: "site.doctor.sso.state.off", variant: "outline" });
    expect(ssoState({ status: "pending_platform" })).toEqual({ key: "site.doctor.sso.state.pending", variant: "warning" });
    expect(ssoState({ status: "active" })).toEqual({ key: "site.doctor.sso.state.active", variant: "success" });
    expect(ssoState({ status: "error" })).toEqual({ key: "site.doctor.sso.state.error", variant: "destructive" });
  });

  it("os metadados do IdP vêm de um endereço https", () => {
    expect(validMetadataUrl("https://login.microsoftonline.com/x/federationmetadata.xml")).toBe(true);
    expect(validMetadataUrl("http://idp.acme.com/meta")).toBe(false);
    expect(validMetadataUrl("https://user@idp.acme.com")).toBe(false);
    expect(validMetadataUrl(`https://${"a".repeat(500)}`)).toBe(false);
  });

  it("domínio em minúsculas, sem espaços, no formato que a API aceita", () => {
    expect(normalizeDomain("  ACME.com.BR ")).toBe("acme.com.br");
    expect(validDomain("acme.com.br")).toBe(true);
    expect(validDomain("acme")).toBe(false);
    expect(validDomain("-acme.com")).toBe(false);
    expect(validDomain("https://acme.com")).toBe(false);
  });

  it("exigir SSO pede ao menos um domínio verificado", () => {
    expect(canRequireSso([{ verified_at: null }])).toBe(false);
    expect(canRequireSso([{ verified_at: null }, { verified_at: "2026-11-17T10:00:00Z" }])).toBe(true);
  });

  it("o mapeamento de grupos vira linhas e volta, recusando o que a API recusaria", () => {
    expect(groupRows({ "AID-Viewers": "viewer", "AID-Admins": "admin" })).toEqual([
      { group: "AID-Admins", role: "admin" }, { group: "AID-Viewers", role: "viewer" },
    ]);
    expect(groupsPayload([{ group: " AID-Admins ", role: "admin" }, { group: "", role: "viewer" }])).toEqual({ ok: true, groups: { "AID-Admins": "admin" } });
    expect(groupsPayload([{ group: "a", role: "admin" }, { group: "a ", role: "viewer" }])).toEqual({ ok: false, index: 1, reason: "duplicate" });
    expect(groupsPayload([{ group: "x".repeat(201), role: "admin" }])).toEqual({ ok: false, index: 0, reason: "length" });
    expect(groupsPayload(Array.from({ length: 101 }, (_, index) => ({ group: `g${index}`, role: "viewer" as const })))).toEqual({ ok: false, index: 100, reason: "tooMany" });
  });
});
