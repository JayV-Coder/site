import type { Me, Organization, Schemas } from "./api";

export type AvailableOrganization = Schemas["AvailableOrganization"];

export interface OrganizationSections {
  /** Já usam o Doctor: escolher troca a Organização ativa. */
  doctor: Organization[];
  /** Do jayv-coder, sem o Doctor, e a pessoa é owner lá: ela ativa aqui mesmo. */
  activatable: AvailableOrganization[];
  /** Do jayv-coder, sem o Doctor, e só o owner de lá ativa. */
  waiting: AvailableOrganization[];
  /** Criar uma nova começa aberto só para quem não tem nenhuma (ADR-0025 do jayv-doctor). */
  createOpen: boolean;
}

export function organizationSections(
  me: Pick<Me, "organizations"> & { available_organizations?: AvailableOrganization[] | undefined },
): OrganizationSections {
  const available = me.available_organizations ?? [];
  return {
    doctor: me.organizations,
    activatable: available.filter(({ coder_role }) => coder_role === "owner"),
    waiting: available.filter(({ coder_role }) => coder_role !== "owner"),
    createOpen: me.organizations.length === 0 && available.length === 0,
  };
}
