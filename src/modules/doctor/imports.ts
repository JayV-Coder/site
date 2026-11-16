import type { Key } from "@/modules/i18n";

/** As regras de tela da Importação manual (Tela 13) e do mapeamento de colunas (#11). */

/** Os campos do Contrato de evento que uma coluna do arquivo pode preencher. */
export const IMPORT_FIELDS = ["timestamp", "severity", "operation", "execution_id", "trace_id", "message", "http_status", "error_code"] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
export type Mapping = Partial<Record<ImportField, string>>;

export const MAX_BYTES = 50 * 1024 * 1024;

export function formatOf(filename: string): "csv" | "ndjson" | "json" | null {
  const extension = filename.toLowerCase().split(".").pop();
  return extension === "csv" || extension === "ndjson" || extension === "json" ? extension : null;
}

/** Uma linha de CSV com aspas: o separador dentro de aspas não divide a coluna. */
function splitCsv(line: string, separator: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') { cell += '"'; index += 1; } else quoted = !quoted;
    } else if (char === separator && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

function keysOf(value: unknown): string[] | null {
  return value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : null;
}

/** As colunas do arquivo, lidas do começo dele no navegador: o cabeçalho do CSV (`,`, `;` ou
 * tab, o mais frequente), ou as chaves do primeiro registro do NDJSON ou do JSON. Sem como ler,
 * nulo: a Importação segue com a detecção pelo nome. */
export function headerColumns(format: "csv" | "ndjson" | "json", text: string): string[] | null {
  const start = text.replace(/^﻿/, "");
  if (format === "csv") {
    const line = start.split(/\r?\n/, 1)[0] ?? "";
    const separator = [",", ";", "\t"].sort((a, b) => line.split(b).length - line.split(a).length)[0] ?? ",";
    const columns = splitCsv(line, separator).filter(Boolean);
    return columns.length > 0 ? columns : null;
  }
  try {
    if (format === "ndjson") return keysOf(JSON.parse(start.split(/\r?\n/, 1)[0] ?? ""));
    const first = firstRecord(start);
    return first === null ? null : keysOf(JSON.parse(first));
  } catch {
    return null;
  }
}

/** O texto do primeiro registro de um JSON (o objeto da raiz, ou o primeiro de uma lista),
 * achado pelas chaves sem ler o arquivo inteiro. Cortado antes de fechar: nulo. */
function firstRecord(text: string): string | null {
  const open = text.indexOf("{");
  if (open < 0 || /[^\s[]/.test(text.slice(0, open))) return null;
  let depth = 0;
  let inString = false;
  for (let index = open; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (char === "\\") index += 1;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(open, index + 1);
    }
  }
  return null;
}

/** As colunas que a API aceita no mapeamento: até 200 caracteres, sem espaço nas pontas. */
export function mappableColumns(columns: readonly string[]): string[] {
  return columns.filter((column) => column.length > 0 && column.length <= 200 && column === column.trim());
}

/** O que vai para a Integração: o mapeamento salvo, mudando só os campos que a pessoa escolheu
 * neste arquivo. Uma sugestão que ninguém tocou não é salva (o worker já reconhece pelo nome), e
 * o salvo para colunas que este arquivo não tem continua valendo para os outros. */
export function mergeMapping(saved: Record<string, string>, chosen: Mapping, touched: ReadonlySet<string>): Record<string, string> {
  const next = { ...saved };
  for (const field of touched) {
    const column = chosen[field as ImportField];
    if (column) next[field] = column;
    else delete next[field];
  }
  return next;
}

/** Pendente esquecida (o envio falhou ou a aba fechou) não fica para sempre: depois deste prazo,
 * a página para de reler por causa dela. */
const PENDING_WINDOW_MS = 30 * 60_000;

export function needsRefresh(imports: readonly { status: string; created_at: string }[], now: Date): boolean {
  return imports.some((item) => item.status === "uploaded" || item.status === "processing"
    || (item.status === "pending" && now.getTime() - new Date(item.created_at).getTime() < PENDING_WINDOW_MS));
}

/** O que a tela propõe: o mapeamento salvo da Integração onde a coluna existe no arquivo; nos
 * outros campos, a sugestão da API pelo nome das colunas. */
export function initialMapping(columns: readonly string[], saved: Record<string, string>, suggestion: Record<string, string>): Mapping {
  const mapping: Mapping = {};
  for (const field of IMPORT_FIELDS) {
    const column = columns.includes(saved[field] ?? "") ? saved[field] : columns.includes(suggestion[field] ?? "") ? suggestion[field] : undefined;
    if (column) mapping[field] = column;
  }
  return mapping;
}

export function mappingChanged(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].some((key) => a[key] !== b[key]);
}

type Variant = "success" | "warning" | "destructive" | "secondary" | "outline";
const STATUS: Record<string, Variant> = {
  pending: "outline", uploaded: "outline", processing: "outline", done: "success", failed: "destructive", rejected: "destructive",
};

export function importBadge(status: string): { key: Key; variant: Variant } {
  return { key: `site.doctor.import.status.${status}` as Key, variant: STATUS[status] ?? "secondary" };
}

