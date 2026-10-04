import { NextResponse, type NextRequest } from "next/server";
import { auth, unstable_update } from "@/auth";
import { exchangeCode, readUser } from "@/modules/auth/account";
import { isProvider } from "@/modules/auth/identities";
import { LINK_COOKIE, type LinkCookie } from "./cookie";

/** A volta do provedor no vínculo de uma conta. O código vira a sessão (com o
 * verificador do cookie) e ela passa a ser a do NextAuth; a página Conta
 * abre na aba de contas vinculadas com o resultado (`linked`, `taken` ou
 * `failed`). */
export async function GET(request: NextRequest, { params }: RouteContext<"/[locale]/dashboard/account/link">) {
  const { locale } = await params;
  const raw = request.cookies.get(LINK_COOKIE)?.value;
  let saved: LinkCookie | null = null;
  try {
    saved = raw ? (JSON.parse(raw) as LinkCookie) : null;
  } catch {
    saved = null;
  }
  const provider = saved && isProvider(saved.provider) ? saved.provider : null;
  const back = (result: "linked" | "taken" | "failed") => {
    const target = new URL(`/${locale}/dashboard/account`, request.url);
    target.searchParams.set("tab", "linked");
    target.searchParams.set("result", result);
    if (provider) target.searchParams.set("provider", provider);
    const response = NextResponse.redirect(target);
    response.cookies.delete(LINK_COOKIE);
    return response;
  };

  const session = await auth();
  if (!session?.accessToken || !saved || !provider) return back("failed");

  // O Supabase diz `identity_already_exists` também quando a identidade já é
  // desta conta (um vínculo anterior que a tela não viu): só as identidades
  // lidas de novo separam os dois casos, como no app.
  const errorCode = request.nextUrl.searchParams.get("error_code");
  if (errorCode) {
    if (errorCode !== "identity_already_exists") return back("failed");
    const user = await readUser(session.accessToken).catch(() => null);
    return back(user?.identities?.some((identity) => identity.provider === provider) ? "linked" : "taken");
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) return back("failed");
  try {
    await unstable_update({ supabase: await exchangeCode(code, saved.verifier) });
    return back("linked");
  } catch (error) {
    console.error("link", error);
    return back("failed");
  }
}
