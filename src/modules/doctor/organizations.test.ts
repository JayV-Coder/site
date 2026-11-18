import { describe, expect, it } from "vitest";
import { organizationSections } from "./organizations";

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
