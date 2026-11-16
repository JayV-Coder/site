"use server";

import { redirect } from "next/navigation";
import { sendForResult, sendToDoctor, type Result } from "@/modules/doctor/send";
import type { Schemas } from "@/modules/doctor/api";
import type { Text } from "@/modules/i18n/types";

type ServiceNowSaved = Schemas["ServiceNowSaved"];

const PAGE = "/[locale]/doctor/tickets";
/** Os códigos que a tela explica; a volta do consentimento do Jira também os usa. */
const KNOWN: Record<string, string> = {
  invalid_site: "site.doctor.itsm.error.site",
  jira_unavailable: "site.doctor.itsm.error.jiraUnavailable",
  jira_unreachable: "site.doctor.itsm.error.jiraUnreachable",
  jira_denied: "site.doctor.itsm.error.jiraDenied",
  secret_required: "site.doctor.itsm.error.secret",
  invalid_state: "site.doctor.itsm.error.state",
};

/** O texto de um código vindo da volta do Jira (`?code=`), ou nulo para um que a tela não conhece. */
export async function jiraFailure(code: string): Promise<string | null> {
  return KNOWN[code] ?? null;
}

/** O consentimento é no Atlassian: a API devolve o endereço com o `state` de uso único. */
export async function connectJira(): Promise<Text | null> {
  const outcome = await sendForResult<Schemas["Authorization"]>("/itsm/jira/authorize", { method: "POST" }, { known: KNOWN });
  if (!outcome.ok) return outcome.error;
  redirect(outcome.value.url);
}

export async function configureJira(config: Schemas["JiraConfig"], key: string): Promise<Text | null> {
  return sendToDoctor("/itsm/jira", { method: "PUT", body: JSON.stringify(config) }, { revalidate: PAGE, key, known: KNOWN, invalid: "site.doctor.itsm.error.jiraInvalid" });
}

export async function disconnectJira(key: string): Promise<Text | null> {
  return sendToDoctor("/itsm/jira", { method: "DELETE" }, { revalidate: PAGE, key, known: KNOWN });
}

/** O secret vai para o cofre e não volta; o endereço da Business Rule aparece uma vez. */
export async function configureServiceNow(config: Schemas["ServiceNowConfig"], key: string): Promise<Result<ServiceNowSaved>> {
  return sendForResult<ServiceNowSaved>("/itsm/servicenow", { method: "PUT", body: JSON.stringify(config) }, {
    revalidate: PAGE, key, known: KNOWN, invalid: "site.doctor.itsm.error.serviceNowInvalid",
  });
}

export async function disconnectServiceNow(key: string): Promise<Text | null> {
  return sendToDoctor("/itsm/servicenow", { method: "DELETE" }, { revalidate: PAGE, key, known: KNOWN });
}
