import type { Key } from "@/modules/i18n";

/** As regras de tela da Base de conhecimento (Tela 14). */

const TYPES: Record<string, { label: string; type: string }> = {
  pdf: { label: "PDF", type: "application/pdf" },
  md: { label: "MD", type: "text/markdown" },
  markdown: { label: "MD", type: "text/markdown" },
  txt: { label: "TXT", type: "text/plain" },
  docx: { label: "DOCX", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
};

export const KNOWLEDGE_ACCEPT = ".pdf,.md,.markdown,.txt,.docx";
export const KNOWLEDGE_MAX_BYTES = 20 * 1024 * 1024;

export function contentTypeOf(filename: string): string | null {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return TYPES[extension]?.type ?? null;
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

export const titleOf = (filename: string) => filename.replace(/\.[^.]+$/, "");
