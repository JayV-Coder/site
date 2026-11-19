import { describe, expect, it } from "vitest";
import { doctorGate, organizationSections } from "./organizations";

const doctor = { id: "d1", name: "Acme", slug: "acme", role: "owner" };
const owned = { id: "c1", name: "Beta", slug: "beta", coder_role: "owner" };
const maintained = { id: "c2", name: "Gama", slug: "gama", coder_role: "maintainer" };
const member = { id: "c3", name: "Delta", slug: "delta", coder_role: "member" };

describe("organizationSections", () => {
  it("separa as que já usam o Doctor, as que a pessoa ativa e as que esperam o owner", () => {
    const sections = organizationSections({ organizations: [doctor], available_organizations: [owned, maintained, member] });
    expect(sections.doctor).toEqual([doctor]);
    expect(sections.activatable).toEqual([owned]);
    expect(sections.waiting).toEqual([maintained, member]);
  });

  it("criar uma nova começa aberto só para quem não tem nenhuma Organização", () => {
    expect(organizationSections({ organizations: [], available_organizations: [] }).createOpen).toBe(true);
    expect(organizationSections({ organizations: [], available_organizations: [member] }).createOpen).toBe(false);
    expect(organizationSections({ organizations: [doctor], available_organizations: [] }).createOpen).toBe(false);
  });

  it("aceita a resposta antiga da API, sem available_organizations", () => {
    const sections = organizationSections({ organizations: [doctor] });
    expect(sections.activatable).toEqual([]);
    expect(sections.waiting).toEqual([]);
  });
});

describe("doctorGate", () => {
  const me = { organizations: [doctor], active_tenant_id: "d1", mfa_required: false };

  it("com a Organização ativa, entra", () => {
    expect(doctorGate(me)).toEqual({ kind: "ok", active: doctor });
  });

  it("sem Organização ativa, vai escolher", () => {
    expect(doctorGate({ ...me, active_tenant_id: null })).toEqual({ kind: "choose" });
  });

  it("a Organização exige MFA e a sessão não o tem: manda configurar, antes de tudo", () => {
    // O doctor_read.me não dá a Organização ativa nesse caso: o aviso vem antes da escolha.
    expect(doctorGate({ ...me, active_tenant_id: null, mfa_required: true })).toEqual({ kind: "mfa" });
  });

  it("aceita a resposta antiga, sem mfa_required", () => {
    expect(doctorGate({ organizations: [doctor], active_tenant_id: "d1" })).toEqual({ kind: "ok", active: doctor });
  });
});
