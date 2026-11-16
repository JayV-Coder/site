import { type NextRequest, NextResponse } from "next/server";
import { doctorFetch } from "@/modules/doctor/api";
import { requestOrigin } from "@/modules/git/server";

/** As linhas recusadas em CSV (`linha,motivo`), pelo servidor: o token fica aqui. Sem o arquivo,
 * volta para a Importação com o motivo em `?download=`. */
export async function GET(request: NextRequest, { params }: RouteContext<"/[locale]/doctor/import/[id]/rejections">): Promise<Response> {
  const { locale, id } = await params;
  const response = await doctorFetch(`/imports/${encodeURIComponent(id)}/rejections`).catch(() => null);
  if (!response?.ok) {
    const base = await requestOrigin().catch(() => request.nextUrl.origin);
    const reason = response?.status === 404 ? "missing" : "unavailable";
    return NextResponse.redirect(new URL(`/${locale}/doctor/import?download=${reason}`, base), 303);
  }
  return new Response(response.body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="rejections-${id.slice(0, 8)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
