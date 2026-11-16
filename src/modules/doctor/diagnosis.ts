import type { Key } from "@/modules/i18n";

/** As regras de tela do Diagnóstico que não dependem de servidor nem de idioma: o selo com a
 * revisão, as etapas que vão rodar, o motivo de um pedido híbrido ter rodado sem IA e as
 * diferenças entre versões. O texto sai pelo `t()` de quem desenha. */

type Variant = "success" | "warning" | "destructive" | "secondary" | "outline";

const STATUS_VARIANT: Record<string, Variant> = {
  queued: "outline",
  running: "outline",
  published: "success",
  inconclusive: "secondary",
  failed_llm: "warning",
  failed: "destructive",
};

const VERDICT_VARIANT: Record<string, Variant> = { corrected: "secondary", accepted: "success", rejected: "destructive" };

export const isActive = (status: string) => status === "queued" || status === "running";

/** Só o resultado final se revisa; o que falhou não tem o que aceitar. */
export const reviewable = (status: string) => status === "published" || status === "inconclusive" || status === "failed_llm";

export const clampConfidence = (value: number) => Math.min(Math.max(value, 0), 1);

type Version = { version: number; status: string };

/** A versão desenhada: a do endereço, se existe; senão a final mais nova (para que um novo
 * Diagnóstico rodando, ou um que falhou, não esconda o resultado e a revisão); sem nenhuma
 * final, a mais nova. A lista vem da mais nova para a mais antiga. */
export function shownVersion<V extends Version>(versions: readonly V[], wanted: string | undefined): V | null {
  return versions.find((item) => String(item.version) === wanted) ?? versions.find((item) => reviewable(item.status)) ?? versions[0] ?? null;
}

/** Com o que comparar: a final anterior, pulando as que falharam ou ainda rodam. */
export function comparedWith<V extends Version>(versions: readonly V[], chosen: V): V | undefined {
  if (!reviewable(chosen.status)) return undefined;
  return versions.find((item) => item.version < chosen.version && reviewable(item.status));
}

/** O veredito que vale para a versão: a correção pesa mais que o aceite, que pesa mais que a recusa. */
export function verdictOf(feedback: readonly { verdict: string }[]): string | null {
  return ["corrected", "accepted", "rejected"].find((verdict) => feedback.some((item) => item.verdict === verdict)) ?? null;
}

export function diagnosisBadge(diagnosis: {
  status: string; requires_human_review: boolean; feedback: readonly { verdict: string }[];
}): { key: Key; variant: Variant } {
  const verdict = verdictOf(diagnosis.feedback);
  if (verdict && reviewable(diagnosis.status)) {
    return { key: `site.doctor.diagnosis.verdict.${verdict}` as Key, variant: VERDICT_VARIANT[verdict] ?? "secondary" };
  }
  if (diagnosis.status === "published" && diagnosis.requires_human_review) {
    return { key: "site.doctor.diagnosis.needsReview", variant: "warning" };
  }
  return { key: `site.doctor.diagnosis.status.${diagnosis.status}` as Key, variant: STATUS_VARIANT[diagnosis.status] ?? "secondary" };
}

const STAGES = ["validation", "correlation", "rules", "knowledge", "llm", "verification"] as const;
export type Stage = (typeof STAGES)[number];

/** Só as etapas que vão rodar: sem IA, nem Base nem LLM; híbrido sem a Base, sem a consulta. */
export function stageSteps(stage: string, mode: string, knowledge: boolean): { stage: Stage; state: "done" | "current" | "todo" }[] {
  const stages = STAGES.filter((item) => {
    if (item === "llm") return mode === "hybrid";
    if (item === "knowledge") return mode === "hybrid" && knowledge;
    return true;
  });
  const current = stages.indexOf(stage as Stage);
  return stages.map((item, index) => ({
    stage: item,
    state: current < 0 ? "todo" : index < current ? "done" : index === current ? "current" : "todo",
  }));
}

/** O worker explica em uma nota por que um pedido híbrido rodou só com as Regras. As notas
 * chegam em português (são dados do Diagnóstico); a tela reconhece o começo de cada uma e
 * mostra o motivo no idioma de quem lê. */
const WITHOUT_AI: [prefix: string, reason: WithoutAi][] = [
  ["Cota de IA", "quota"],
  ["Envio de evidências ao LLM desligado", "llm_disabled"],
  ["Modelo local não configurado", "local_missing"],
];
export type WithoutAi = "quota" | "llm_disabled" | "local_missing" | "other";

export function withoutAiReason(diagnosis: {
  requested_mode: string; mode: string; status: string; verification_notes: readonly string[];
}): WithoutAi | null {
  if (diagnosis.requested_mode !== "hybrid" || diagnosis.mode !== "rules_only" || diagnosis.status === "failed_llm") return null;
  for (const note of diagnosis.verification_notes) {
    const found = WITHOUT_AI.find(([prefix]) => note.startsWith(prefix));
    if (found) return found[1];
  }
  return "other";
}

type Comparable = {
  status: string; classification: string | null; confidence: number | null;
  responsible_system: string | null; probable_cause: string | null;
};

export type VersionChange =
  | { field: "status" | "classification" | "system"; from: string | null; to: string | null }
  | { field: "confidence"; from: number | null; to: number | null }
  | { field: "cause" };

export function versionChanges(before: Comparable, after: Comparable): VersionChange[] {
  const found: VersionChange[] = [];
  if (before.status !== after.status) found.push({ field: "status", from: before.status, to: after.status });
  if (before.classification !== after.classification) found.push({ field: "classification", from: before.classification, to: after.classification });
  if (before.confidence !== after.confidence) found.push({ field: "confidence", from: before.confidence, to: after.confidence });
  if (before.responsible_system !== after.responsible_system) found.push({ field: "system", from: before.responsible_system, to: after.responsible_system });
  if (before.probable_cause !== after.probable_cause) found.push({ field: "cause" });
  return found;
}

export function reviewTimeParts(seconds: number | null): { unit: "lessThanMinute" } | { unit: "minutes" | "hours"; count: number } | null {
  if (seconds === null) return null;
  if (seconds < 60) return { unit: "lessThanMinute" };
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return { unit: "minutes", count: minutes };
  return { unit: "hours", count: Math.round(minutes / 60) };
}

export const SYSTEMS = ["sap", "salesforce", "gcp", "other"] as const;

/** Nome do sistema: as marcas não se traduzem; "outro" e "indeterminado" sim. */
export function systemName(system: string | null): { name: string } | { key: Key } {
  if (system === "sap") return { name: "SAP" };
  if (system === "salesforce") return { name: "Salesforce" };
  if (system === "gcp") return { name: "Google Cloud" };
  if (system === "other") return { key: "site.doctor.diagnosis.system.other" };
  return system ? { name: system } : { key: "site.doctor.diagnosis.system.unknown" };
}

export function evidenceKind(item: { kind: string; label: string }): { rule: string } | { key: Key } {
  if (item.kind === "rule_match") return { rule: item.label.split(" · ")[0] };
  if (item.kind === "event") return { key: "site.doctor.diagnosis.evidence.event" };
  if (item.kind === "raw_log") return { key: "site.doctor.diagnosis.evidence.log" };
  // Consulta de leitura no destino (#40): o registro está lá, não no Doctor.
  if (item.kind === "enrichment") return { key: "site.doctor.diagnosis.evidence.lookup" };
  return { key: "site.doctor.diagnosis.evidence.knowledge" };
}

/** Da Evidência ao Evento original num toque (o instante leva a consulta à partição dele) ou à
 * Execução. A consulta no destino (#40) está lá, não no Doctor; a Base ainda não tem tela aqui. */
export function evidenceHref(base: string, item: {
  kind: string; event_id: string | null; event_timestamp: string | null; execution_id: string | null;
}): string | null {
  if (item.kind === "enrichment" || item.kind === "chunk" || item.kind === "global_chunk") return null;
  if (item.event_id) return `${base}/doctor/events/${item.event_id}${item.event_timestamp ? `?at=${encodeURIComponent(item.event_timestamp)}` : ""}`;
  return item.execution_id ? `${base}/doctor/executions/${item.execution_id}` : null;
}
