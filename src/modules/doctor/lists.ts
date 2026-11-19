import "server-only";
import { doctorList, type Schemas } from "./api";
import { doctorRead } from "./read";

type Integration = Schemas["Integration"];
type Connector = Schemas["Connector"];

/** As Integrações da Organização ativa, direto no Supabase (`doctor_read.integrations`,
 * ADR-0026 do jayv-doctor); sem ele, pela API. `null` quando nenhum dos dois respondeu. */
export async function listIntegrations({ includeArchived = false }: { includeArchived?: boolean } = {}): Promise<Integration[] | null> {
  const direct = await doctorRead<Integration[]>("integrations", { include_archived: includeArchived });
  if (direct.ok) return direct.value;
  return doctorList<Integration[]>(includeArchived ? "/integrations?include_archived=true" : "/integrations");
}

/** Os Conectores da Organização ativa, direto no Supabase (`doctor_read.connectors`); sem ele,
 * pela API. */
export async function listConnectors(): Promise<Connector[] | null> {
  const direct = await doctorRead<Connector[]>("connectors");
  if (direct.ok) return direct.value;
  return doctorList<Connector[]>("/connectors");
}
