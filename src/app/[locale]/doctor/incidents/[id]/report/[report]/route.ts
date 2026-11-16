import { type NextRequest, NextResponse } from "next/server";
import { doctorFetch, type Schemas } from "@/modules/doctor/api";
import { downloadName } from "@/modules/doctor/reports";
import { requestOrigin } from "@/modules/git/server";

type Report = Schemas["Report"];

/** "Baixar": a URL assinada (curta) nasce na hora do clique, com o nome do arquivo. O número do
 * Incidente vem da página (só dá nome ao arquivo). Quando não dá para entregar, volta para o
 * relatório com o motivo em `?download=`, em vez de deixar quem clicou numa página de texto. */
export async function GET(request: NextRequest, { params }: RouteContext<"/[locale]/doctor/incidents/[id]/report/[report]">): Promise<Response> {
  const { locale, id, report } = await params;
  // A origem pública (cabeçalhos do proxy), não a interna de `request.url`.
  const base = await requestOrigin().catch(() => request.nextUrl.origin);
  const back = (reason: "missing" | "not_ready" | "unavailable") =>
    NextResponse.redirect(new URL(`/${locale}/doctor/incidents/${encodeURIComponent(id)}/report?download=${reason}`, base), 303);
  const response = await doctorFetch(`/reports/${encodeURIComponent(report)}`).catch(() => null);
  if (!response) return back("unavailable");
  if (response.status === 404 || response.status === 422) return back("missing");
  if (!response.ok) return back("unavailable");
  const found = (await response.json()) as Report;
  if (found.incident_id !== id) return back("missing");
  if (!found.download_url) return back("not_ready");
  const number = Number(request.nextUrl.searchParams.get("number"));
  const url = new URL(found.download_url);
  url.searchParams.set("download", Number.isInteger(number) && number > 0 ? downloadName(number, found.format) : `report-${found.id.slice(0, 8)}.${found.format}`);
  return NextResponse.redirect(url, 303);
}
