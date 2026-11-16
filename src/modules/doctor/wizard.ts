import { INTERVALS } from "./connectors";

/** O assistente de novo Conector (Tela 12): Google Cloud e Salesforce (#37). O rascunho do Google
 * Cloud fica no sessionStorage, para quem sai e volta não perder o progresso, e nunca leva a
 * credencial: ela só existe na memória da página. */

export const GCP_DRAFT_KEY = "doctor:connector-gcp";
export const SEVERITIES = ["DEFAULT", "INFO", "NOTICE", "WARNING", "ERROR", "CRITICAL"] as const;

export interface GcpDraft {
  step: 1 | 2 | 3 | 4;
  name: string;
  project_id: string;
  services: string;
  min_severity: (typeof SEVERITIES)[number];
  filter: string;
  sync_interval_seconds: number;
  backfill_hours: 24 | 168;
  integration_id: string;
}

export const EMPTY_GCP: GcpDraft = {
  step: 1, name: "", project_id: "", services: "", min_severity: "DEFAULT", filter: "", sync_interval_seconds: 300, backfill_hours: 24, integration_id: "",
};

/** A mesma regra do Conector (packages/connectors/.../gcp/connector.py). */
const PROJECT = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
export const validProject = (value: string) => PROJECT.test(value);

/** O nome é opcional (sem ele vale o projeto ou o provedor); preenchido, 2 a 80 caracteres. */
export const validName = (value: string) => value.trim() === "" || (value.trim().length >= 2 && value.trim().length <= 80);

export function buildGcpConfig(draft: GcpDraft): Record<string, unknown> {
  const services = draft.services.split(",").map((service) => service.trim()).filter(Boolean);
  const filter = draft.filter.trim();
  return {
    project_id: draft.project_id,
    auth: "key",
    ...(services.length > 0 && { services }),
    ...(draft.min_severity !== "DEFAULT" && { min_severity: draft.min_severity }),
    ...(filter && { filter }),
    backfill_hours: draft.backfill_hours,
  };
}

/** Só os campos conhecidos, com os tipos certos; qualquer outra coisa recomeça do zero. */
export function readGcpDraft(raw: string | null): GcpDraft {
  if (!raw) return EMPTY_GCP;
  try {
    const saved = JSON.parse(raw) as Partial<Record<keyof GcpDraft, unknown>>;
    const draft: GcpDraft = { ...EMPTY_GCP };
    for (const key of Object.keys(EMPTY_GCP) as (keyof GcpDraft)[]) {
      if (typeof saved[key] !== typeof EMPTY_GCP[key]) return EMPTY_GCP;
      Object.assign(draft, { [key]: saved[key] });
    }
    // O projeto entra em comandos de copiar e colar: passado o passo 1, ele tem de ser válido.
    const valid = [1, 2, 3, 4].includes(draft.step) && [24, 168].includes(draft.backfill_hours)
      && (SEVERITIES as readonly string[]).includes(draft.min_severity)
      && (INTERVALS as readonly number[]).includes(draft.sync_interval_seconds)
      && (draft.project_id === "" ? draft.step === 1 : validProject(draft.project_id));
    return valid ? draft : EMPTY_GCP;
  } catch {
    return EMPTY_GCP;
  }
}

/** Só leitura de logs: a Service Account não ganha nenhum outro papel no projeto do cliente. */
export function gcloudCommands(project: string): string[] {
  const account = `doctor-reader@${project}.iam.gserviceaccount.com`;
  return [
    `gcloud iam service-accounts create doctor-reader --project=${project} --display-name="Integration AI Doctor"`,
    `gcloud projects add-iam-policy-binding ${project} --member="serviceAccount:${account}" --role="roles/logging.viewer"`,
    `gcloud iam service-accounts keys create doctor-reader.json --iam-account=${account}`,
  ];
}

/** Salesforce: a config só escolhe itens da allowlist (fontes, objeto __c e campos); nenhum
 * texto de SOQL sai daqui. */
export const SALESFORCE_SOURCES = ["integration_log", "apex_log", "event_log_file"] as const;
export type SalesforceSource = (typeof SALESFORCE_SOURCES)[number];

export type SalesforceDraft = {
  name: string;
  environment: "production" | "sandbox";
  auth: "jwt_bearer" | "web_server";
  object: string;
  message_field: string;
  severity_field: string;
  sources: SalesforceSource[];
  sync_interval_seconds: number;
  integration_id: string;
};

export const EMPTY_SALESFORCE: SalesforceDraft = {
  name: "", environment: "production", auth: "jwt_bearer", object: "", message_field: "", severity_field: "", sources: [], sync_interval_seconds: 300, integration_id: "",
};

const CUSTOM_OBJECT = /^[A-Za-z][A-Za-z0-9_]{0,39}__c$/;
const FIELD = /^[A-Za-z][A-Za-z0-9_]{0,79}$/;
export const validObject = (name: string) => name === "" || CUSTOM_OBJECT.test(name);
export const validField = (name: string) => name === "" || FIELD.test(name);

export function buildSalesforceConfig(draft: SalesforceDraft): Record<string, unknown> {
  const config: Record<string, unknown> = { environment: draft.environment, auth: draft.auth, sources: draft.sources };
  if (draft.sources.includes("integration_log") && draft.object) {
    config.integration_log = {
      object: draft.object,
      timestamp_field: "CreatedDate",
      ...(draft.message_field && { message_field: draft.message_field }),
      ...(draft.severity_field && { severity_field: draft.severity_field }),
    };
  }
  return config;
}

/** Para o teste de conexão: pede todas as fontes, e a resposta diz quais a org tem. */
export function probeSalesforceConfig(draft: SalesforceDraft): Record<string, unknown> {
  return buildSalesforceConfig({ ...draft, sources: draft.object ? [...SALESFORCE_SOURCES] : ["apex_log", "event_log_file"] });
}
