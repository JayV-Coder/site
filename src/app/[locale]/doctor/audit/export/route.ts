import { type NextRequest, NextResponse } from "next/server";
import { doctorFetch } from "@/modules/doctor/api";
import { readCategory } from "@/modules/doctor/audit";
import { requestOrigin } from "@/modules/git/server";

/** O CSV da Trilha de auditoria: o formulário manda os filtros no corpo (o termo não vai para a
 * URL), e a resposta da API, gerada enquanto é enviada, segue direto para o navegador. Sem o
 * arquivo, volta para a Auditoria com o aviso. */
export async function POST(request: NextRequest, { params }: RouteContext<"/[locale]/doctor/audit/export">): Promise<Response> {
  const { locale } = await params;
  const form = await request.formData().catch(() => null);
  const text = (name: string) => {
    const found = form?.get(name);
    return typeof found === "string" && found.trim() ? found.trim() : undefined;
  };
  const category = readCategory(text("category"));
  const q = text("q");
  const response = await doctorFetch("/audit-logs/export", {
    method: "POST",
    body: JSON.stringify({ ...(category && { category }), ...(q && { q }) }),
  }).catch(() => null);
  if (!response?.ok || !response.body) {
    const base = await requestOrigin().catch(() => request.nextUrl.origin);
    const target = new URL(`/${locale}/doctor/audit`, base);
    if (category) target.searchParams.set("category", category);
    target.searchParams.set("export", response?.status === 403 ? "forbidden" : "failed");
    return NextResponse.redirect(target, 303);
  }
  return new Response(response.body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": response.headers.get("content-disposition") ?? 'attachment; filename="audit.csv"',
      "cache-control": "no-store",
    },
  });
}
