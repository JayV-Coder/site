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

export type DoctorGate = { kind: "ok"; active: Organization } | { kind: "choose" } | { kind: "mfa" };

/** Para onde vai quem abre o Doctor: a Organização ativa exige MFA e a sessão não o tem (#49 do
 * jayv-doctor) → configurar o app autenticador; sem Organização ativa → escolher; senão, entra. */
export function doctorGate(
  me: Pick<Me, "organizations" | "active_tenant_id"> & { mfa_required?: boolean | undefined },
): DoctorGate {
  if (me.mfa_required) return { kind: "mfa" };
  const active = me.organizations.find(({ id }) => id === me.active_tenant_id);
  return active ? { kind: "ok", active } : { kind: "choose" };
}
