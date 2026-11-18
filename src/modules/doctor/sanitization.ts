/** As regras de tela das regras de Sanitização da Organização (#13). A API confere de novo com o
 * Sanitizer (packages/security do jayv-doctor); aqui a tela avisa antes, na linha certa. */

export const MAX_PATTERNS = 20;
export const MAX_PATTERN_LENGTH = 200;
const KIND = /^[a-z][a-z0-9_]{1,30}$/;
/** Quantificador sobre um grupo que já tem um dentro, como `(a+)+` ou `((a+))+`: backtracking
 * catastrófico. Lê o padrão ignorando o que está escapado (`\(`) e dentro de `[...]`. */
function nestedQuantifier(pattern: string): boolean {
  const open: { quantified: boolean }[] = [];
  let inClass = false;
  let lastClosed: { quantified: boolean } | null = null;
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === "\\") { index += 1; lastClosed = null; continue; }
    if (inClass) { if (char === "]") inClass = false; continue; }
    if (char === "[") { inClass = true; lastClosed = null; continue; }
    if (char === "(") { open.push({ quantified: false }); lastClosed = null; continue; }
    if (char === ")") { lastClosed = open.pop() ?? null; if (lastClosed?.quantified && open.length > 0) open[open.length - 1]!.quantified = true; continue; }
    if (char === "+" || char === "*" || char === "{" || (char === "?" && pattern[index - 1] !== "(")) {
      // `?` depois de outro quantificador (`+?`) é preguiçoso, não repete nada.
      const repeats = char !== "?";
      if (lastClosed?.quantified && repeats) return true;
      if (repeats && open.length > 0) open[open.length - 1]!.quantified = true;
      lastClosed = null;
      continue;
    }
    lastClosed = null;
  }
  return false;
}

export type Row = { kind: string; pattern: string };
export type RowProblem = "kind" | "empty" | "length" | "nested" | "matchesEmpty" | "duplicate" | "tooMany";
/** Em que campo da linha o problema aparece. */
export type RowField = "kind" | "pattern";
const FIELD: Record<RowProblem, RowField> = { kind: "kind", duplicate: "kind", tooMany: "kind", empty: "pattern", length: "pattern", nested: "pattern", matchesEmpty: "pattern" };

export function readRows(patterns: Record<string, string> | undefined | null): Row[] {
  return Object.entries(patterns ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([kind, pattern]) => ({ kind, pattern }));
}

/** O padrão no navegador, quando a sintaxe é a mesma (grupo nomeado do Python, por exemplo, não é). */
function compiled(pattern: string, flags = ""): RegExp | null {
  try { return new RegExp(pattern, flags); } catch { return null; }
}

/** `count`: as linhas preenchidas (a vazia é ignorada); o botão de adicionar usa o mesmo número. */
export function rowsPayload(rows: readonly Row[]):
  | { ok: true; patterns: Record<string, string>; count: number }
  | { ok: false; index: number; reason: RowProblem; field: RowField } {
  const patterns: Record<string, string> = {};
  let count = 0;
  const fail = (index: number, reason: RowProblem) => ({ ok: false as const, index, reason, field: FIELD[reason] });
  for (const [index, row] of rows.entries()) {
    const kind = row.kind.trim();
    const pattern = row.pattern;
    if (!kind && !pattern.trim()) continue;
    if (++count > MAX_PATTERNS) return fail(index, "tooMany");
    if (!KIND.test(kind)) return fail(index, "kind");
    if (Object.hasOwn(patterns, kind)) return fail(index, "duplicate");
    if (!pattern.trim()) return fail(index, "empty");
    if (pattern.length > MAX_PATTERN_LENGTH) return fail(index, "length");
    if (nestedQuantifier(pattern)) return fail(index, "nested");
    if (compiled(pattern)?.test("")) return fail(index, "matchesEmpty");
    patterns[kind] = pattern;
  }
  return { ok: true, patterns, count };
}

/** A prévia no navegador, com as regras do worker para os padrões próprios: tudo é achado no
 * texto original, na sobreposição vale a linha de cima, e cada trecho vira `[REMOVIDO:<tipo>]`.
 * Só entram as linhas que podem ser salvas (e que o navegador compila); os detectores da
 * plataforma ficam de fora. */
export function previewSanitized(sample: string, rows: readonly Row[]): string {
  const spans: { start: number; end: number; kind: string }[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const kind = row.kind.trim();
    if (!kind || seen.has(kind) || !rowsPayload([row]).ok) continue;
    seen.add(kind);
    const pattern = compiled(row.pattern, "g");
    if (!pattern) continue;
    for (const match of sample.matchAll(pattern)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (end > start && !spans.some((span) => start < span.end && end > span.start)) spans.push({ start, end, kind });
    }
  }
  spans.sort((a, b) => a.start - b.start);
  let text = "";
  let at = 0;
  for (const span of spans) {
    text += `${sample.slice(at, span.start)}[REMOVIDO:${span.kind}]`;
    at = span.end;
  }
  return text + sample.slice(at);
}
