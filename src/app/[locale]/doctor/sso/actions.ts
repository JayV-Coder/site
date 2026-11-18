"use server";

import type { Schemas } from "@/modules/doctor/api";
import { sendForResult, sendToDoctor, type Result } from "@/modules/doctor/send";
import type { Text } from "@/modules/i18n/types";

const PAGE = "/[locale]/doctor/sso";
const KNOWN = {
  domain_required: "site.doctor.sso.error.domainRequired",
  domain_taken: "site.doctor.sso.error.domainTaken",
  sso_not_configured: "site.doctor.sso.error.notConfigured",
  not_found: "site.doctor.sso.error.notFound",
  forbidden: "site.doctor.sso.ownerOnly",
};
const id = (value: string) => encodeURIComponent(value);

/** Cria ou atualiza a conexão; a plataforma registra o provedor no Supabase Auth depois. */
export async function saveConnection(config: Schemas["SsoConfigIn"], key: string): Promise<Text | null> {
  return sendToDoctor("/sso", { method: "PUT", body: JSON.stringify(config) }, { revalidate: PAGE, key, known: KNOWN, invalid: "site.doctor.sso.error.metadata" });
}

export async function disableSso(key: string): Promise<Text | null> {
  return sendToDoctor("/sso", { method: "DELETE" }, { revalidate: PAGE, key, known: KNOWN });
}

export async function addDomain(domain: string, key: string): Promise<Result<Schemas["SsoDomain"]>> {
  return sendForResult<Schemas["SsoDomain"]>("/sso/domains", { method: "POST", body: JSON.stringify({ domain }) }, {
    revalidate: PAGE, key, known: KNOWN, invalid: "site.doctor.sso.error.domain",
  });
}

/** Pede a consulta ao DNS (202): a tela acompanha pelo `verified_at`. */
export async function verifyDomain(domain: string, key: string): Promise<Text | null> {
  return sendToDoctor(`/sso/domains/${id(domain)}/verify`, { method: "POST" }, { revalidate: PAGE, key, known: KNOWN });
}

export async function removeDomain(domain: string, key: string): Promise<Text | null> {
  return sendToDoctor(`/sso/domains/${id(domain)}`, { method: "DELETE" }, { revalidate: PAGE, key, known: KNOWN });
}

export async function saveGroups(groups: Schemas["SsoGroupsIn"]["groups"], key: string): Promise<Text | null> {
  return sendToDoctor("/sso/groups", { method: "PUT", body: JSON.stringify({ groups }) }, { revalidate: PAGE, key, known: KNOWN, invalid: "site.doctor.sso.error.groups" });
}

/** Token SCIM novo: aparece só nesta resposta, e o anterior deixa de valer. */
export async function rotateScimToken(key: string): Promise<Result<Schemas["ScimToken"]>> {
  return sendForResult<Schemas["ScimToken"]>("/sso/scim-token", { method: "POST" }, { revalidate: PAGE, key, known: KNOWN });
}
