import "server-only";
import { doctorList, type Schemas } from "./api";
import { readOr } from "./read";

type Integration = Schemas["Integration"];
type Connector = Schemas["Connector"];

/** As Integrações da Organização ativa, direto no Supabase (`doctor_read.integrations`,
 * ADR-0026 do jayv-doctor); sem ele, pela API. `null` quando nenhum dos dois respondeu. */
export async function listIntegrations({ includeArchived = false }: { includeArchived?: boolean } = {}): Promise<Integration[] | null> {
  return readOr<Integration[]>("integrations", { include_archived: includeArchived }, () =>
    doctorList<Integration[]>(includeArchived ? "/integrations?include_archived=true" : "/integrations"));
}

/** Os Conectores da Organização ativa, direto no Supabase (`doctor_read.connectors`); sem ele,
 * pela API. */
export async function listConnectors(): Promise<Connector[] | null> {
  return readOr<Connector[]>("connectors", {}, () => doctorList<Connector[]>("/connectors"));
}
