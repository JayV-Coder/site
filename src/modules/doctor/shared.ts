/** As regras do link compartilhável do Relatório técnico (ADR-0014 do jayv-doctor). */

/** O token do fragmento (`#…`), como a API emite (`token_urlsafe`, 32 a 128 caracteres de
 * base64url). Fora disso, o link está quebrado e nem vai à API. */
export function shareToken(hash: string): string | null {
  const token = hash.startsWith("#") ? hash.slice(1) : hash;
  return /^[A-Za-z0-9_-]{32,128}$/.test(token) ? token : null;
}

/** O nome do arquivo que a API dá (`filename*` com acentos, senão `filename`), sem caminho. */
export function downloadName(disposition: string | null): string {
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition ?? "")?.[1];
  let name = /filename="([^"]+)"/i.exec(disposition ?? "")?.[1] ?? "";
  if (encoded) {
    try { name = decodeURIComponent(encoded); } catch { /* fica o `filename` */ }
  }
  return name.split(/[\\/]/).pop()?.trim() || "report";
}
