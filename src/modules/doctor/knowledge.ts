import type { Key } from "@/modules/i18n";

/** As regras de tela da Base de conhecimento (Tela 14). */

const TYPES: Record<string, { label: string; type: string }> = {
  pdf: { label: "PDF", type: "application/pdf" },
  md: { label: "MD", type: "text/markdown" },
  markdown: { label: "MD", type: "text/markdown" },
  txt: { label: "TXT", type: "text/plain" },
  docx: { label: "DOCX", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
};

export const KNOWLEDGE_ACCEPT = Object.keys(TYPES).map((extension) => `.${extension}`).join(",");
export const KNOWLEDGE_MAX_BYTES = 20 * 1024 * 1024;

export function contentTypeOf(filename: string): string | null {
  // Sem ponto não há extensão: um arquivo chamado só "pdf" não é PDF.
  const extension = /\.([^.]+)$/.exec(filename)?.[1]?.toLowerCase() ?? "";
  return Object.hasOwn(TYPES, extension) ? TYPES[extension].type : null;
}

/** INC é um caso promovido de um Incidente resolvido; o resto, o tipo do arquivo. */
export function documentKind(document: { source: string; content_type: string | null }): string {
  if (document.source === "incident") return "INC";
  return Object.values(TYPES).find(({ type }) => type === document.content_type)?.label ?? "DOC";
}

type Variant = "success" | "destructive" | "outline";
const STATES: Record<string, Variant> = { ready: "success", failed: "destructive", pending: "outline", indexing: "outline" };

export function documentState(status: string): { key: Key; variant: Variant } {
  return { key: `site.doctor.knowledge.state.${status}` as Key, variant: STATES[status] ?? "outline" };
}

/** O título vem do nome do arquivo sem a extensão. A API pede de 1 a 200 caracteres sem espaço
 * nas pontas: sem nada além da extensão (".md"), o título é o nome inteiro. */
export function titleOf(filename: string): string {
  const title = filename.replace(/\.[^.]+$/, "").trim() || filename.trim();
  return [...title].slice(0, 200).join("").trim();
}

/** Documento pendente esquecido (o envio falhou ou a aba fechou) não fica para sempre: depois deste
 * prazo, a página para de reler por causa dele. */
const PENDING_WINDOW_MS = 30 * 60_000;

export function needsRefresh(documents: readonly { status: string; created_at: string }[], now: Date): boolean {
  return documents.some((item) => item.status === "indexing"
    || (item.status === "pending" && now.getTime() - new Date(item.created_at).getTime() < PENDING_WINDOW_MS));
}
