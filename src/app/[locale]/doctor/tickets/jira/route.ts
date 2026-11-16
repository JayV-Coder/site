import { type NextRequest, NextResponse } from "next/server";
import { doctorFetch } from "@/modules/doctor/api";
import { requestOrigin } from "@/modules/git/server";

/** Volta do consentimento do Atlassian (#43): o código e o `state` vão à API com a sessão de
 * quem pediu; o `state` é de uso único e desta Organização. O endereço registrado no Atlassian é
 * `APP_URL/doctor/tickets/jira`: o site acrescenta o idioma e mantém a query. */
export async function GET(request: NextRequest, { params }: RouteContext<"/[locale]/doctor/tickets/jira">): Promise<Response> {
  const { locale } = await params;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  let result = "failed";
  if (code && state) {
    const response = await doctorFetch("/itsm/jira/callback", { method: "POST", body: JSON.stringify({ code, state }) }).catch(() => null);
    if (response?.ok) result = "connected";
  }
  const base = await requestOrigin().catch(() => request.nextUrl.origin);
  return NextResponse.redirect(new URL(`/${locale}/doctor/tickets?jira=${result}`, base), 303);
}
