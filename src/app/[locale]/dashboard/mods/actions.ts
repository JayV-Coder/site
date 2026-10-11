"use server";

import { revalidatePath } from "next/cache";
import type { Text } from "@/modules/i18n/types";
import {
  CUSTOM_PREFIX, draftOf, draftOfTemplate, draftProblems, environmentOk, MAX_MODS, modId, optionsOf, templateAgentId, type ModDraft,
} from "@/modules/mods/rules";
import { modCatalog } from "@/modules/mods/server";
import { userSupabase } from "@/modules/supabase/server";
import { loadAccess } from "../access";
import { loadOrganizations } from "../organizations/data";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: Text | string };

type Supabase = NonNullable<Awaited<ReturnType<typeof userSupabase>>>;

const refused = (key: string, params?: Record<string, string>): { ok: false; error: Text } => ({ ok: false, error: params ? { key, params } : { key } });

/** O ambiente é o pessoal ou o de uma organização de quem entrou: a linha é
 * dele de qualquer jeito (RLS), mas um ambiente de que ele não faz parte nunca
 * seria aberto no app. */
async function environmentOf(environment: string) {
  if (!environmentOk(environment)) return false;
  if (environment === "personal") return true;
  return (await loadOrganizations()).some((organization) => organization.id === environment);
}

/** Tudo que grava passa por aqui: com sessão, com o recurso no plano e num
 * ambiente de quem entrou. */
async function writer(environment: string): Promise<{ error: { ok: false; error: Text } } | { supabase: Supabase }> {
  const [supabase, access] = await Promise.all([userSupabase(), loadAccess()]);
  if (!supabase || !access) return { error: refused("site.session.failed") };
  if (!access.mods && !access.admin) return { error: refused("mods.empty.locked") };
  if (!(await environmentOf(environment))) return { error: refused("site.mods.environment.unknown") };
  return { supabase };
}

const now = () => new Date().toISOString();

/** As opções gravadas: texto JSON no banco (como o app sobe), objeto se vier assim. */
function optionsRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

/** Os modelos como o núcleo os grava: os de um mod que escreve no projeto
 * podem fazer código e usar ferramentas. */
const capabilitiesOf = (draft: ModDraft) => (draft.kind === "cli" && draft.edits ? ["chat", "code", "reasoning", "tools"] : ["chat", "reasoning"]);

/** Cria a linha do mod no ambiente, ligada, com o primeiro modelo, como o
 * "Criar mod" do app fazia. O app a recebe na próxima volta do sync. */
async function create(supabase: Supabase, environment: string, id: string, draft: ModDraft): Promise<ActionResult<string>> {
  const at = now();
  const agent = await supabase.from("llm_agents").upsert({
    environment_id: environment, id, enabled: 1, command: draft.kind === "cli" ? draft.command.trim() : "", timeout: 300,
    options: JSON.stringify(optionsOf(draft)), updated_at: at, row_updated_at: at, row_deleted_at: null,
  }, { onConflict: "user_id,environment_id,id" });
  if (agent.error) return { ok: false, error: agent.error.message };
  const model = draft.model.trim();
  if (model) {
    const row = await supabase.from("llm_models").upsert({
      environment_id: environment, agent: id, model, enabled: 1, capabilities: JSON.stringify(capabilitiesOf(draft)),
      cost_class: "medium", speed: "medium", context_window: 128000, position: 0, row_updated_at: at, row_deleted_at: null,
    }, { onConflict: "user_id,environment_id,agent,model" });
    if (row.error) return { ok: false, error: row.error.message };
  }
  revalidatePath("/[locale]/dashboard/mods", "page");
  return { ok: true, data: id };
}

/** Os mods ativos do ambiente. */
async function activeIds(supabase: Supabase, environment: string) {
  const { data, error } = await supabase.from("llm_agents").select("id, command, options")
    .eq("environment_id", environment).like("id", `${CUSTOM_PREFIX}%`).is("row_deleted_at", null);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Cria um mod (`id` nulo) ou grava a definição de um que já existe. O tipo
 * não muda depois de criado, e o que é da máquina (a chave guardada, a
 * aprovação dos servidores MCP) fica como estava. */
export async function saveMod(environment: string, id: string | null, draft: ModDraft): Promise<ActionResult<string>> {
  const gate = await writer(environment);
  if ("error" in gate) return gate.error;
  const { supabase } = gate;
  try {
    const active = await activeIds(supabase, environment);
    if (id === null) {
      if (Object.keys(draftProblems(draft)).length > 0) return refused("site.mods.invalid");
      if (active.length >= MAX_MODS) return refused("mods.tooMany", { max: String(MAX_MODS) });
      // O id não repete um mod do ambiente nem o de um mod pronto do catálogo,
      // que vira `mod-<id>` quando instalado.
      const catalog = await modCatalog();
      const reserved = (catalog?.mods ?? []).filter((mod) => mod.kind === "template").map(templateAgentId);
      return await create(supabase, environment, modId(draft.name, [...active.map((row) => row.id as string), ...reserved]), draft);
    }
    const current = active.find((row) => row.id === id);
    if (!current) return refused("site.mods.notFound");
    const kept = optionsRecord(current.options);
    const fixed: ModDraft = { ...draft, kind: draftOf(kept, "").kind, model: "" };
    if (Object.keys(draftProblems(fixed)).length > 0) return refused("site.mods.invalid");
    const at = now();
    const { error } = await supabase.from("llm_agents").update({
      command: fixed.kind === "cli" ? fixed.command.trim() : "", options: JSON.stringify(optionsOf(fixed, kept)), updated_at: at, row_updated_at: at,
    }).eq("environment_id", environment).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/[locale]/dashboard/mods", "page");
    return { ok: true, data: id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "unknown" };
  }
}

/** Apaga o mod e os modelos dele no ambiente, como as exclusões do app: a
 * linha fica marcada (`row_deleted_at`), e cada máquina a tira na volta do sync. */
export async function deleteMod(environment: string, id: string): Promise<ActionResult> {
  const gate = await writer(environment);
  if ("error" in gate) return gate.error;
  if (!id.startsWith(CUSTOM_PREFIX)) return refused("site.mods.notFound");
  const at = now();
  const models = await gate.supabase.from("llm_models").update({ row_deleted_at: at, row_updated_at: at })
    .eq("environment_id", environment).eq("agent", id).is("row_deleted_at", null);
  if (models.error) return { ok: false, error: models.error.message };
  const agent = await gate.supabase.from("llm_agents").update({ row_deleted_at: at, row_updated_at: at })
    .eq("environment_id", environment).eq("id", id);
  if (agent.error) return { ok: false, error: agent.error.message };
  revalidatePath("/[locale]/dashboard/mods", "page");
  return { ok: true, data: undefined };
}

/** Instala um mod pronto do catálogo como um mod de quem entrou, com o id
 * `mod-<id do catálogo>` — o mesmo do botão Instalar do app. */
export async function installTemplate(environment: string, templateId: string, locale: string): Promise<ActionResult<string>> {
  const gate = await writer(environment);
  if ("error" in gate) return gate.error;
  const manifest = (await modCatalog())?.mods.find((mod) => mod.kind === "template" && mod.id === templateId);
  const draft = manifest ? draftOfTemplate(manifest, locale) : null;
  if (!manifest || !draft) return refused("site.mods.notFound");
  try {
    const active = await activeIds(gate.supabase, environment);
    const id = templateAgentId(manifest);
    if (active.some((row) => row.id === id)) return refused("site.mods.alreadyInstalled");
    if (active.length >= MAX_MODS) return refused("mods.tooMany", { max: String(MAX_MODS) });
    return await create(gate.supabase, environment, id, draft);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "unknown" };
  }
}
