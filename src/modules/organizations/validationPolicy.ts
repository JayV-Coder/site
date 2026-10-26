/** A política de validação da organização: se os builds dos projetos dela
 * precisam ser validados (testes, lint, typecheck e build) e se `git commit` e
 * `git push` ficam retidos no chat enquanto a última validação falhou. É o
 * mesmo formato de `set_validation_policy`; o app (jayv-coder) a lê em
 * `my_project_policies` (`validation_required`, `hold_commits`). */

export interface ValidationPolicy {
  required: boolean;
  holdCommits: boolean;
}

export const NO_VALIDATION: ValidationPolicy = { required: false, holdCommits: false };

/** Uma linha de `organization_validation` como o supabase-js a devolve. */
export function storedValidation(row: Record<string, unknown> | null | undefined): ValidationPolicy {
  const required = row?.required === true;
  return { required, holdCommits: required && row?.hold_commits === true };
}

/** Reter commit só vale com a validação exigida: desligar uma desliga a outra. */
export function withRequired(policy: ValidationPolicy, required: boolean): ValidationPolicy {
  return { required, holdCommits: required && policy.holdCommits };
}

export function withHold(policy: ValidationPolicy, holdCommits: boolean): ValidationPolicy {
  return holdCommits ? { required: true, holdCommits: true } : { ...policy, holdCommits: false };
}

export const sameValidation = (a: ValidationPolicy, b: ValidationPolicy) => a.required === b.required && a.holdCommits === b.holdCommits;
