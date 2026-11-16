import { Badge } from "@/components/ui/badge";
import type { Schemas } from "@/modules/doctor/api";
import {
  diagnosisBadge, evidenceKind, isActive, reviewTimeParts, stageSteps, systemName, versionChanges, withoutAiReason,
} from "@/modules/doctor/diagnosis";
import type { Key } from "@/modules/i18n";
import { getT } from "@/modules/i18n/server";
import { cn } from "@/lib/utils";

type DiagnosisDetail = Schemas["DiagnosisDetail"];
type T = Awaited<ReturnType<typeof getT>>;
type Props = { locale: string; diagnosis: DiagnosisDetail };

const card = "grid gap-3 rounded-lg border border-border bg-card px-4 py-4";
const sectionTitle = "text-sm font-medium";

/** A Confiança é heurística, nunca probabilidade: o rótulo vai sempre junto do número. */
function confidenceText(t: T, locale: string, value: number | null) {
  if (value === null) return "—";
  const shown = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.min(Math.max(value, 0), 1));
  return t("site.doctor.diagnosis.confidenceValue", { value: shown });
}

function systemText(t: T, system: string | null) {
  const found = systemName(system);
  return "name" in found ? found.name : t(found.key);
}

const statusText = (t: T, status: string) => t(`site.doctor.diagnosis.status.${status}` as Key);

/** O card da Tela 6. Inconclusivo não afirma Causa provável; IA que falhou avisa que o resultado
 * é só das Regras. */
export async function DiagnosisCard({ locale, diagnosis }: Props) {
  const t = await getT(locale);
  const badge = diagnosisBadge(diagnosis);
  return (
    <section aria-labelledby="doctor-diagnosis" className={card}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="doctor-diagnosis" className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
          {t("site.doctor.diagnosis.header", { version: diagnosis.version, mode: t(`site.doctor.diagnosis.mode.${diagnosis.mode}`) })}
        </h2>
        <Badge variant={badge.variant}>{t(badge.key)}</Badge>
      </div>
      {isActive(diagnosis.status) ? <Progress t={t} diagnosis={diagnosis} />
        : diagnosis.status === "failed" ? (
          <div role="alert" className="grid gap-1 text-sm">
            <p className="text-destructive">{t("site.doctor.diagnosis.failed")}</p>
            {diagnosis.error && <p className="text-xs text-muted-foreground">{t("site.doctor.diagnosis.failedDetail", { error: diagnosis.error })}</p>}
          </div>
        ) : <Result t={t} locale={locale} diagnosis={diagnosis} />}
    </section>
  );
}

function Progress({ t, diagnosis }: { t: T; diagnosis: DiagnosisDetail }) {
  const steps = stageSteps(diagnosis.stage, diagnosis.requested_mode, diagnosis.include_knowledge_base);
  const current = steps.find((step) => step.state === "current");
  return (
    <>
      <p role="status" className="text-sm">
        {diagnosis.status === "queued" || !current
          ? t("site.doctor.diagnosis.queuedNow")
          : t("site.doctor.diagnosis.runningNow", { stage: t(`site.doctor.diagnosis.stage.${current.stage}`) })}
      </p>
      <ol aria-label={t("site.doctor.diagnosis.stages")} className="grid gap-1 text-sm">
        {steps.map((step) => (
          <li key={step.stage} aria-current={step.state === "current" ? "step" : undefined}
            className={cn("flex items-center gap-2", step.state === "todo" && "text-muted-foreground", step.state === "current" && "font-medium")}>
            <span aria-hidden="true" className="w-4 text-center">{step.state === "done" ? "✓" : step.state === "current" ? "●" : "○"}</span>
            {t(`site.doctor.diagnosis.stage.${step.stage}`)}
          </li>
        ))}
      </ol>
    </>
  );
}

function Result({ t, locale, diagnosis }: { t: T; locale: string; diagnosis: DiagnosisDetail }) {
  const withoutAi = withoutAiReason(diagnosis);
  // A correção mais recente, a mesma que a promoção à Base usa.
  const correction = diagnosis.feedback.filter((item) => item.verdict === "corrected").at(-1);
  const percent = diagnosis.confidence === null ? 0 : Math.round(Math.min(Math.max(diagnosis.confidence, 0), 1) * 100);
  const reviewTime = (seconds: number | null) => {
    const parts = reviewTimeParts(seconds);
    if (!parts) return null;
    return parts.unit === "lessThanMinute"
      ? t("site.doctor.diagnosis.reviewTime.lessThanMinute")
      : t(`site.doctor.diagnosis.reviewTime.${parts.unit}`, { count: parts.count });
  };
  return (
    <>
      {correction && (
        <div className="grid gap-1 rounded-md border border-border bg-secondary px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">{t("site.doctor.diagnosis.correctedByReview")}</span>
          {correction.correct_category && <span className="font-mono text-xs">{correction.correct_category}</span>}
          {correction.correct_cause && <p className="text-sm">{correction.correct_cause}</p>}
        </div>
      )}
      {withoutAi && <p role="status" className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm">{t(`site.doctor.diagnosis.withoutAi.${withoutAi}`)}</p>}
      {diagnosis.status === "failed_llm" && <p role="status" className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm">{t("site.doctor.diagnosis.aiFailed")}</p>}
      {diagnosis.status === "inconclusive" ? (
        <div className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">{t("site.doctor.diagnosis.insufficient")}</span>
          <p className="text-sm leading-relaxed">{t("site.doctor.diagnosis.insufficientBody")}</p>
        </div>
      ) : (
        <div className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">{t("site.doctor.diagnosis.probableCause")}</span>
          <p className="text-base leading-relaxed break-words">{diagnosis.probable_cause ?? "—"}</p>
        </div>
      )}
      {diagnosis.confidence !== null && (
        <div role="meter" aria-label={t("site.doctor.diagnosis.confidence")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
          aria-valuetext={confidenceText(t, locale, diagnosis.confidence)} className="grid gap-1">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{t("site.doctor.diagnosis.confidence")}</span>
            <span className="font-mono">{confidenceText(t, locale, diagnosis.confidence)}</span>
          </div>
          <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-foreground/70" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">{t("site.doctor.diagnosis.system")}</dt><dd>{systemText(t, diagnosis.responsible_system)}</dd>
        {diagnosis.classification && (<><dt className="text-muted-foreground">{t("site.doctor.diagnosis.classification")}</dt><dd className="font-mono text-xs leading-5">{diagnosis.classification}</dd></>)}
        <dt className="text-muted-foreground">{t("site.doctor.diagnosis.ruleset")}</dt><dd className="font-mono text-xs leading-5">{diagnosis.ruleset_version ?? "—"}</dd>
        {diagnosis.model && (<><dt className="text-muted-foreground">{t("site.doctor.diagnosis.model")}</dt><dd className="font-mono text-xs leading-5 break-all">{diagnosis.model}</dd></>)}
      </dl>
      {diagnosis.feedback.length > 0 && (
        <ul aria-label={t("site.doctor.diagnosis.reviews")} className="grid gap-1 text-xs text-muted-foreground">
          {diagnosis.feedback.map((item) => (
            <li key={item.id}>
              {[t(`site.doctor.diagnosis.verdict.${item.verdict}`), reviewTime(item.time_to_review_s), item.comment].filter(Boolean).join(" · ")}
            </li>
          ))}
        </ul>
      )}
      {diagnosis.verification_notes.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">{t("site.doctor.diagnosis.notes", { count: diagnosis.verification_notes.length })}</summary>
          {/* As notas são dados do Diagnóstico, no idioma em que o worker as escreveu. */}
          <ul className="mt-1 grid list-disc gap-1 ps-5">
            {diagnosis.verification_notes.map((note, index) => <li key={index}>{note}</li>)}
          </ul>
        </details>
      )}
    </>
  );
}

/** Sem Diagnóstico: ou não há nenhum ainda, ou a API não respondeu. */
export async function DiagnosisEmpty({ locale, failed }: { locale: string; failed: boolean }) {
  const t = await getT(locale);
  return (
    <section aria-label={t("site.doctor.diagnosis.title")} className={card}>
      <h2 className="font-mono text-xs tracking-wide text-muted-foreground uppercase">{t("site.doctor.diagnosis.title")}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{t(failed ? "site.doctor.diagnosis.unavailable" : "site.doctor.diagnosis.none")}</p>
    </section>
  );
}

export async function VersionDifferences({ locale, before, after }: { locale: string; before: DiagnosisDetail; after: DiagnosisDetail }) {
  const t = await getT(locale);
  const found = versionChanges(before, after);
  const value = (field: string, raw: string | number | null) => {
    if (field === "status") return statusText(t, String(raw));
    if (field === "system") return systemText(t, raw as string | null);
    if (field === "confidence") return confidenceText(t, locale, raw as number | null);
    return raw === null ? "—" : String(raw);
  };
  return (
    <section aria-labelledby="doctor-differences" className={card}>
      <h2 id="doctor-differences" className={sectionTitle}>{t("site.doctor.diagnosis.differences", { version: before.version })}</h2>
      {found.length === 0 ? <p className="text-sm text-muted-foreground">{t("site.doctor.diagnosis.sameResult")}</p> : (
        <ul className="grid gap-1 text-sm">
          {found.map((change) => (
            <li key={change.field}>
              {change.field === "cause" ? t("site.doctor.diagnosis.change.cause")
                : t(`site.doctor.diagnosis.change.${change.field}`, { from: value(change.field, change.from), to: value(change.field, change.to) })}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export async function DiagnosisHypotheses({ locale, diagnosis }: Props) {
  if (diagnosis.hypotheses.length === 0) return null;
  const t = await getT(locale);
  return (
    <section aria-labelledby="doctor-hypotheses" className="grid content-start gap-2">
      <h2 id="doctor-hypotheses" className={sectionTitle}>{t("site.doctor.diagnosis.hypotheses", { count: diagnosis.hypotheses.length })}</h2>
      <ol className="grid gap-2">
        {diagnosis.hypotheses.map((item) => (
          <li key={item.rank} className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <span className="font-mono text-xs leading-5 text-muted-foreground">{String(item.rank).padStart(2, "0")}</span>
            <span className="min-w-0 flex-1 text-sm break-words">{item.statement}</span>
            <Badge variant={item.rank === 1 ? "warning" : "secondary"} className="shrink-0">{confidenceText(t, locale, item.confidence)}</Badge>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Sempre ações humanas: numeradas, sem botão de execução. */
export async function DiagnosisRecommendations({ locale, diagnosis }: Props) {
  if (diagnosis.recommendations.length === 0) return null;
  const t = await getT(locale);
  return (
    <section aria-labelledby="doctor-recommendations" className="grid content-start gap-2">
      <h2 id="doctor-recommendations" className={sectionTitle}>{t("site.doctor.diagnosis.recommendations")}</h2>
      <ol className="grid list-decimal gap-1.5 rounded-lg border border-border bg-card py-3 ps-9 pe-4 text-sm">
        {diagnosis.recommendations.map((item) => <li key={item.rank} className="break-words">{item.text}</li>)}
      </ol>
    </section>
  );
}

export async function DiagnosisEvidence({ locale, diagnosis }: Props) {
  if (isActive(diagnosis.status)) return null;
  const t = await getT(locale);
  return (
    <section aria-labelledby="doctor-evidence" className="grid content-start gap-2">
      <h2 id="doctor-evidence" className={sectionTitle}>{t("site.doctor.diagnosis.evidence", { count: diagnosis.evidence.length })}</h2>
      {diagnosis.evidence.length === 0 ? <p className="text-sm text-muted-foreground">{t("site.doctor.diagnosis.noEvidence")}</p> : (
        <ul className="grid gap-2">
          {diagnosis.evidence.map((item) => {
            const kind = evidenceKind(item);
            return (
              <li key={item.rank} className="grid gap-1 rounded-lg border border-border bg-card px-4 py-3">
                <span className="flex flex-wrap items-center gap-2">
                  {"rule" in kind ? <Badge variant="outline" mono>{kind.rule}</Badge> : <Badge variant="secondary">{t(kind.key)}</Badge>}
                  <span className="min-w-0 text-sm break-words">{item.finding}</span>
                </span>
                <span className="text-xs break-words text-muted-foreground">{item.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
