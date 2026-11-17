import { describe, expect, it } from "vitest";
import {
  clampConfidence, comparedWith, diagnosisBadge, evidenceHref, shownVersion, evidenceKind, isActive, reviewable, reviewTimeParts, stageSteps, versionChanges, withoutAiReason,
} from "./diagnosis";

const base = {
  version: 2, status: "published", classification: "SAP_LOCK", confidence: 0.68, responsible_system: "sap",
  probable_cause: "Bloqueio no pedido", requires_human_review: false, feedback: [] as { verdict: string }[],
};

describe("Diagnóstico", () => {
  it("só fila e andamento contam como ativos", () => {
    expect(isActive("queued")).toBe(true);
    expect(isActive("running")).toBe(true);
    expect(isActive("published")).toBe(false);
    expect(isActive("failed")).toBe(false);
  });

  it("revisa-se o publicado, o inconclusivo e o que rodou só com as Regras; nunca o que falhou", () => {
    expect(["published", "inconclusive", "failed_llm"].every(reviewable)).toBe(true);
    expect(["queued", "running", "failed"].some(reviewable)).toBe(false);
  });

  it("o selo mostra a revisão: a correção pesa mais que o aceite, que pesa mais que a recusa", () => {
    expect(diagnosisBadge({ ...base, feedback: [{ verdict: "rejected" }, { verdict: "accepted" }] }))
      .toEqual({ key: "site.doctor.diagnosis.verdict.accepted", variant: "success" });
    expect(diagnosisBadge({ ...base, feedback: [{ verdict: "accepted" }, { verdict: "corrected" }] }))
      .toEqual({ key: "site.doctor.diagnosis.verdict.corrected", variant: "secondary" });
    expect(diagnosisBadge({ ...base, feedback: [{ verdict: "rejected" }] }))
      .toEqual({ key: "site.doctor.diagnosis.verdict.rejected", variant: "destructive" });
  });

  it("sem revisão, o publicado que pede revisão humana avisa; o resto mostra o status", () => {
    expect(diagnosisBadge({ ...base, requires_human_review: true }))
      .toEqual({ key: "site.doctor.diagnosis.needsReview", variant: "warning" });
    expect(diagnosisBadge(base)).toEqual({ key: "site.doctor.diagnosis.status.published", variant: "success" });
    expect(diagnosisBadge({ ...base, status: "failed_llm" })).toEqual({ key: "site.doctor.diagnosis.status.failed_llm", variant: "warning" });
    // Revisão de uma versão que falhou não muda o selo (o banco nem a aceita).
    expect(diagnosisBadge({ ...base, status: "failed", feedback: [{ verdict: "accepted" }] }))
      .toEqual({ key: "site.doctor.diagnosis.status.failed", variant: "destructive" });
  });

  it("as etapas são só as que vão rodar: sem IA não há Base nem LLM", () => {
    expect(stageSteps("rules", "rules_only", true)).toEqual([
      { stage: "validation", state: "done" },
      { stage: "correlation", state: "done" },
      { stage: "rules", state: "current" },
      { stage: "verification", state: "todo" },
    ]);
    expect(stageSteps("llm", "hybrid", false).map((step) => step.stage)).toEqual(["validation", "correlation", "rules", "llm", "verification"]);
    expect(stageSteps("knowledge", "hybrid", true).map((step) => step.state)).toEqual(["done", "done", "done", "current", "todo", "todo"]);
    // Na fila, nada começou.
    expect(stageSteps("queued", "hybrid", true).every((step) => step.state === "todo")).toBe(true);
  });

  it("pedido híbrido que rodou só com as Regras diz o motivo, pela nota do worker", () => {
    const ran = { requested_mode: "hybrid", mode: "rules_only", status: "published" };
    expect(withoutAiReason({ ...ran, verification_notes: ["Sem Eventos no intervalo.", "Cota de IA do mês esgotada: Diagnóstico só com as Regras."] })).toBe("quota");
    expect(withoutAiReason({ ...ran, verification_notes: ["Cota de IA indisponível: Diagnóstico só com as Regras."] })).toBe("quota");
    expect(withoutAiReason({ ...ran, verification_notes: ["Envio de evidências ao LLM desligado pela Organização: Diagnóstico só com as Regras."] })).toBe("llm_disabled");
    expect(withoutAiReason({ ...ran, verification_notes: ["Modelo local não configurado: Diagnóstico só com as Regras."] })).toBe("local_missing");
    expect(withoutAiReason({ ...ran, verification_notes: [] })).toBe("other");
    // Pedido só com Regras não precisa de explicação; IA que falhou tem o próprio aviso.
    expect(withoutAiReason({ ...ran, requested_mode: "rules_only", verification_notes: [] })).toBeNull();
    expect(withoutAiReason({ ...ran, status: "failed_llm", verification_notes: [] })).toBeNull();
    expect(withoutAiReason({ ...ran, mode: "hybrid", verification_notes: [] })).toBeNull();
  });

  it("compara as versões campo a campo; a causa só diz que mudou", () => {
    const after = { ...base, version: 3, status: "inconclusive", classification: null, confidence: 0.4, responsible_system: null, probable_cause: "Outra" };
    expect(versionChanges(base, after)).toEqual([
      { field: "status", from: "published", to: "inconclusive" },
      { field: "classification", from: "SAP_LOCK", to: null },
      { field: "confidence", from: 0.68, to: 0.4 },
      { field: "system", from: "sap", to: null },
      { field: "cause" },
    ]);
    expect(versionChanges(base, { ...base })).toEqual([]);
  });

  it("o tempo até a revisão vai na maior unidade que cabe", () => {
    expect(reviewTimeParts(null)).toBeNull();
    expect(reviewTimeParts(40)).toEqual({ unit: "lessThanMinute" });
    expect(reviewTimeParts(600)).toEqual({ unit: "minutes", count: 10 });
    expect(reviewTimeParts(7200)).toEqual({ unit: "hours", count: 2 });
  });

  it("o selo da Evidência: a Regra pelo código, o resto pelo tipo", () => {
    expect(evidenceKind({ kind: "rule_match", label: "SAP-001 · v3" })).toEqual({ rule: "SAP-001" });
    expect(evidenceKind({ kind: "event", label: "x" })).toEqual({ key: "site.doctor.diagnosis.evidence.event" });
    expect(evidenceKind({ kind: "raw_log", label: "x" })).toEqual({ key: "site.doctor.diagnosis.evidence.log" });
    expect(evidenceKind({ kind: "enrichment", label: "x" })).toEqual({ key: "site.doctor.diagnosis.evidence.lookup" });
    expect(evidenceKind({ kind: "chunk", label: "x" })).toEqual({ key: "site.doctor.diagnosis.evidence.knowledge" });
    expect(evidenceKind({ kind: "global_chunk", label: "x" })).toEqual({ key: "site.doctor.diagnosis.evidence.knowledge" });
  });

  it("sem versão no endereço, mostra a final mais nova; a que roda ou falhou fica no seletor", () => {
    const versions = [{ version: 3, status: "running" }, { version: 2, status: "failed" }, { version: 1, status: "published" }];
    expect(shownVersion(versions, undefined)?.version).toBe(1);
    expect(shownVersion(versions, "2")?.version).toBe(2);
    expect(shownVersion(versions, "9")?.version).toBe(1);
    // Sem nenhuma final, a mais nova (o card mostra o andamento).
    expect(shownVersion([{ version: 1, status: "queued" }], undefined)?.version).toBe(1);
    expect(shownVersion([], undefined)).toBeNull();
  });

  it("as diferenças comparam com a final anterior, pulando as que falharam ou rodam", () => {
    const versions = [{ version: 4, status: "published" }, { version: 3, status: "failed" }, { version: 2, status: "running" }, { version: 1, status: "inconclusive" }];
    expect(comparedWith(versions, versions[0])?.version).toBe(1);
    expect(comparedWith(versions, versions[3])).toBeUndefined();
    // A escolhida que falhou ou roda não tem com o que comparar.
    expect(comparedWith(versions, versions[1])).toBeUndefined();
  });

  it("a Confiança fica entre 0 e 1", () => {
    expect(clampConfidence(1.2)).toBe(1);
    expect(clampConfidence(-0.1)).toBe(0);
    expect(clampConfidence(0.68)).toBe(0.68);
  });

  it("a Evidência leva ao Evento (com o instante, para a partição), à Execução ou à Base; a consulta no destino não tem tela", () => {
    const item = { kind: "event", event_id: "e1", event_timestamp: "2026-11-16T01:00:00Z", execution_id: "x1" };
    expect(evidenceHref("/pt-BR", item)).toBe("/pt-BR/doctor/events/e1?at=2026-11-16T01%3A00%3A00Z");
    expect(evidenceHref("/pt-BR", { ...item, kind: "rule_match", event_id: null, event_timestamp: null })).toBe("/pt-BR/doctor/executions/x1");
    expect(evidenceHref("/pt-BR", { ...item, kind: "enrichment" })).toBeNull();
    // A Base abre na aba certa.
    expect(evidenceHref("/pt-BR", { ...item, kind: "chunk", event_id: null, execution_id: null })).toBe("/pt-BR/doctor/knowledge");
    expect(evidenceHref("/pt-BR", { ...item, kind: "global_chunk", event_id: null, execution_id: null })).toBe("/pt-BR/doctor/knowledge?tab=global");
  });
});
