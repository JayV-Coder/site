import { DOCTOR_API_URL } from "@/modules/doctor/api";

/** Sem sessão: repassa o token (que veio no corpo, não na URL) à API do Doctor, que confere o
 * link e devolve o arquivo. O token nunca vai para log nem para o endereço. */
export async function POST(request: Request): Promise<Response> {
  const { token } = (await request.json().catch(() => ({}))) as { token?: unknown };
  if (typeof token !== "string" || token.length < 32 || token.length > 128) return new Response(null, { status: 404 });
  const response = await fetch(`${DOCTOR_API_URL}/api/v1/shared-reports`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok || !response.body) return new Response(null, { status: response?.status === 404 ? 404 : 502 });
  return new Response(response.body, {
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/octet-stream",
      "content-disposition": response.headers.get("content-disposition") ?? "attachment",
      "cache-control": "no-store",
    },
  });
}
