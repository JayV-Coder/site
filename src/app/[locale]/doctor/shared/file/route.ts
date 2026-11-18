import { doctorPublicFetch } from "@/modules/doctor/api";
import { shareToken } from "@/modules/doctor/shared";

/** Sem sessão: repassa o token (no corpo, nunca na URL) à API, que confere o link (vencido,
 * revogado) e devolve o arquivo. A URL assinada do Storage não sai da API (ADR-0014). */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { token?: unknown };
  const token = typeof body.token === "string" ? shareToken(body.token) : null;
  if (!token) return new Response(null, { status: 404 });
  const response = await doctorPublicFetch("/shared-reports", { method: "POST", body: JSON.stringify({ token }) }).catch(() => null);
  // 404: inválido, vencido ou revogado; 429: o limite por IP da porta anônima (com o tempo de espera).
  if (!response?.ok || !response.body) {
    const status = response?.status === 404 || response?.status === 429 ? response.status : 502;
    const retry = response?.headers.get("retry-after");
    return new Response(null, { status, headers: retry ? { "retry-after": retry } : {} });
  }
  return new Response(response.body, {
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/octet-stream",
      "content-disposition": response.headers.get("content-disposition") ?? "attachment",
      "cache-control": "no-store",
    },
  });
}
