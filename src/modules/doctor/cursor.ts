/** O cursor da lista de Incidentes: (last_seen_at, id) do último item, no mesmo formato do
 * `encode_cursor` da API (base64 url-safe, com preenchimento, de `[instante, id]`). Assim a
 * página seguinte sai tanto pela leitura direta (`doctor_read`, ADR-0026 do jayv-doctor) quanto
 * pela API. */
export interface Cursor { at: string; id: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function writeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify([cursor.at, cursor.id])).toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
}

export function readCursor(text: string | null): Cursor | null {
  if (!text) return null;
  try {
    const value: unknown = JSON.parse(Buffer.from(text, "base64url").toString());
    if (!Array.isArray(value) || value.length !== 2) return null;
    const [at, id] = value as unknown[];
    if (typeof at !== "string" || typeof id !== "string") return null;
    if (Number.isNaN(Date.parse(at)) || !UUID.test(id)) return null;
    return { at, id };
  } catch {
    return null;
  }
}
