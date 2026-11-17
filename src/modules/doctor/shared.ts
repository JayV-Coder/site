/** As regras do link compartilhável do Relatório técnico (ADR-0014 do jayv-doctor). */

/** O token do fragmento (`#…`), como a API emite (`token_urlsafe`, 32 a 128 caracteres de
 * base64url). Fora disso, o link está quebrado e nem vai à API. */
export function shareToken(hash: string): string | null {
  const token = hash.startsWith("#") ? hash.slice(1) : hash;
  return /^[A-Za-z0-9_-]{32,128}$/.test(token) ? token : null;
}

const EXTENSIONS: Record<string, string> = { "application/pdf": ".pdf", "text/markdown": ".md" };

/** O nome do arquivo do `content-disposition` (`filename*` com acentos, senão `filename`, com ou
 * sem aspas), sem caminho. Sem nome, `report` com a extensão do tipo. */
export function dispositionFilename(disposition: string | null, contentType: string | null): string {
  const header = disposition ?? "";
  const encoded = /filename\*\s*=\s*UTF-8'[^']*'([^;]+)/i.exec(header)?.[1];
  let name = /filename\s*=\s*"([^"]*)"/i.exec(header)?.[1] ?? /filename\s*=\s*([^;"\s]+)/i.exec(header)?.[1] ?? "";
  if (encoded) {
    try { name = decodeURIComponent(encoded.trim()); } catch { /* fica o `filename` */ }
  }
  const base = name.split(/[\\/]/).pop()?.trim();
  if (base) return base;
  return `report${EXTENSIONS[(contentType ?? "").split(";")[0]?.trim().toLowerCase() ?? ""] ?? ""}`;
}
