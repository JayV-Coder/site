import { NextResponse, type NextRequest } from "next/server";
import { auditCsv, auditRange, auditRowsOf } from "@/modules/organizations/audit";
import { userSupabase } from "@/modules/supabase/server";

/** Baixa o log de auditoria da organização (`?from=AAAA-MM-DD&to=AAAA-MM-DD&
 * format=csv|json`), com o token de quem entrou: o banco só entrega a owner e
 * maintainer. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const query = request.nextUrl.searchParams;
  const range = auditRange(query.get("from"), query.get("to"));
  const format = query.get("format") === "json" ? "json" : "csv";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !range) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const supabase = await userSupabase();
  if (!supabase) return NextResponse.json({ error: "signedOut" }, { status: 401 });
  const { data, error } = await supabase.rpc("org_audit", { org: id, from_day: range.from, to_day: range.to });
  if (error) return NextResponse.json({ error: error.message }, { status: error.message === "org.forbidden" ? 403 : 400 });
  const rows = auditRowsOf(data);
  const name = `jayv-audit-${range.from}-${range.to}.${format}`;
  const body = format === "json" ? `${JSON.stringify(rows, null, 2)}\n` : auditCsv(rows);
  return new NextResponse(body, {
    headers: {
      "Content-Type": format === "json" ? "application/json; charset=utf-8" : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
