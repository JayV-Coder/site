/** O cursor das leituras diretas (`doctor_read`, ADR-0026 do jayv-doctor): (last_seen_at, id) do
 * último item, num texto que vai no endereço. O prefixo `r.` o separa do cursor da API, que a
 * busca por texto continua usando. */
export interface Cursor { at: string; id: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function writeCursor(cursor: Cursor): string {
  return `r.${Buffer.from(JSON.stringify(cursor)).toString("base64url")}`;
}

export function readCursor(text: string | null): Cursor | null {
  if (!text?.startsWith("r.")) return null;
  try {
    const value = JSON.parse(Buffer.from(text.slice(2), "base64url").toString()) as Partial<Cursor>;
    if (typeof value.at !== "string" || typeof value.id !== "string") return null;
    if (Number.isNaN(Date.parse(value.at)) || !UUID.test(value.id)) return null;
    return { at: value.at, id: value.id };
  } catch {
    return null;
  }
}
