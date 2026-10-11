import "server-only";
import { CUSTOM_PREFIX } from "@/modules/mods/rules";
import { userSupabase } from "@/modules/supabase/server";

/** Um mod de quem entrou, como a configuração sincronizada dele o guarda
 * (`llm_agents`): o mesmo que o app lê e grava. */
export interface StoredMod {
  id: string;
  enabled: boolean;
  command: string;
  options: Record<string, unknown>;
  /** Quantos modelos ele tem no ambiente. */
  models: number;
  updatedAt: string;
}

function parseOptions(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null) return value as Record<string, unknown>;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

/** Os mods de quem entrou num ambiente, do mais novo nome ao mais velho
 * — pelo nome, como as abas do app. Nulo quando o banco não respondeu. O RLS
 * só devolve as linhas dele. */
export async function loadMods(environment: string): Promise<StoredMod[] | null> {
  const supabase = await userSupabase();
  if (!supabase) return null;
  const [agents, models] = await Promise.all([
    supabase.from("llm_agents").select("id, enabled, command, options, updated_at")
      .eq("environment_id", environment).like("id", `${CUSTOM_PREFIX}%`).is("row_deleted_at", null),
    supabase.from("llm_models").select("agent")
      .eq("environment_id", environment).like("agent", `${CUSTOM_PREFIX}%`).is("row_deleted_at", null),
  ]);
  if (agents.error || models.error) {
    console.error("mods", agents.error ?? models.error);
    return null;
  }
  const counts: Record<string, number> = {};
  for (const row of models.data ?? []) counts[row.agent as string] = (counts[row.agent as string] ?? 0) + 1;
  return (agents.data ?? []).map((row) => ({
    id: row.id as string,
    enabled: Number(row.enabled) !== 0,
    command: (row.command as string) ?? "",
    options: parseOptions(row.options),
    models: counts[row.id as string] ?? 0,
    updatedAt: (row.updated_at as string) ?? "",
  })).sort((a, b) => String(a.options.name ?? a.id).localeCompare(String(b.options.name ?? b.id)) || a.id.localeCompare(b.id));
}
