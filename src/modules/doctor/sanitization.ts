/** As regras de tela das regras de Sanitização da Organização (#13). A API confere de novo com o
 * Sanitizer (packages/security do jayv-doctor); aqui a tela avisa antes, na linha certa. */

export const MAX_PATTERNS = 20;
export const MAX_PATTERN_LENGTH = 200;
const KIND = /^[a-z][a-z0-9_]{1,30}$/;
/** O mesmo do Sanitizer: quantificador sobre grupo que já tem um, como `(a+)+`. */
const NESTED_QUANTIFIER = /\([^)]*[+*}][^)]*\)\s*[+*{]/;

export type Row = { kind: string; pattern: string };
export type RowProblem = "kind" | "empty" | "length" | "nested" | "matchesEmpty" | "duplicate" | "tooMany";

export function readRows(patterns: Record<string, string> | undefined | null): Row[] {
  return Object.entries(patterns ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([kind, pattern]) => ({ kind, pattern }));
}

/** O padrão no navegador, quando a sintaxe é a mesma (grupo nomeado do Python, por exemplo, não é). */
function compiled(pattern: string, flags = ""): RegExp | null {
  try { return new RegExp(pattern, flags); } catch { return null; }
}

export function rowsPayload(rows: readonly Row[]): { ok: true; patterns: Record<string, string> } | { ok: false; index: number; reason: RowProblem } {
  const patterns: Record<string, string> = {};
  let count = 0;
  for (const [index, row] of rows.entries()) {
    const kind = row.kind.trim();
    const pattern = row.pattern;
    if (!kind && !pattern.trim()) continue;
    if (++count > MAX_PATTERNS) return { ok: false, index, reason: "tooMany" };
    if (!KIND.test(kind)) return { ok: false, index, reason: "kind" };
    if (Object.hasOwn(patterns, kind)) return { ok: false, index, reason: "duplicate" };
    if (!pattern.trim()) return { ok: false, index, reason: "empty" };
    if (pattern.length > MAX_PATTERN_LENGTH) return { ok: false, index, reason: "length" };
    if (NESTED_QUANTIFIER.test(pattern)) return { ok: false, index, reason: "nested" };
    if (compiled(pattern)?.test("")) return { ok: false, index, reason: "matchesEmpty" };
    patterns[kind] = pattern;
  }
  return { ok: true, patterns };
}

/** A prévia no navegador: cada padrão troca o que acha por `[REMOVIDO:<tipo>]`, como no worker. */
export function previewSanitized(sample: string, rows: readonly Row[]): string {
  let text = sample;
  for (const row of rows) {
    const kind = row.kind.trim();
    const pattern = KIND.test(kind) && row.pattern && !NESTED_QUANTIFIER.test(row.pattern) ? compiled(row.pattern, "g") : null;
    if (pattern && !pattern.test("")) text = text.replace(pattern, `[REMOVIDO:${kind}]`);
  }
  return text;
}
