import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { sameText } from "@/modules/git/seal";
import { accountName, exchangeCode, readState, requestOrigin, STATE_COOKIE, tokensCookie, TOKENS_COOKIE } from "@/modules/git/server";
import { looksLikeLocale } from "@/modules/i18n/render";
import { orgFailure } from "@/modules/organizations/rules";
import { userSupabase } from "@/modules/supabase/server";

type Outcome = "connected" | "denied" | "forbidden" | "failed";

/** A volta do provedor git (o mesmo endereço nos três apps OAuth). Confere o
 * `state` com o cookie e a pessoa com a sessão, troca o código pelo token,
 * grava no banco qual conta foi conectada (`org_connect_git`, só o owner) e
 * guarda o token só no cookie cifrado. A organização abre na aba de
 * repositórios com o resultado em `git`. */
export async function GET(request: NextRequest) {
  const sealed = readState(request.cookies.get(STATE_COOKIE)?.value);
  // O cookie é cifrado, mas o endereço da volta só sai de um idioma e de uma
  // organização com formato válido.
  const saved = sealed && looksLikeLocale(sealed.locale) && /^[0-9a-f-]{36}$/i.test(sealed.org) ? sealed : null;
  // Atrás de um proxy, `request.url` é o endereço interno do servidor
  // (`http://localhost:3000`): a volta usa a origem pública, a mesma do
  // `redirect_uri` gravado no início (ou a dos cabeçalhos do proxy).
  const base = saved ? new URL(saved.redirectUri).origin : await requestOrigin().catch(() => request.nextUrl.origin);
  const back = (outcome: Outcome, cookie?: ReturnType<typeof tokensCookie>) => {
    const target = saved
      ? new URL(`/${saved.locale}/dashboard/organizations/${saved.org}`, base)
      : new URL("/dashboard/organizations", base);
    if (saved) {
      target.searchParams.set("tab", "repositories");
      target.searchParams.set("git", outcome);
      target.searchParams.set("provider", saved.provider);
      if (outcome === "connected" && saved.pick) target.searchParams.set("pick", "1");
    }
    const response = NextResponse.redirect(target);
    response.cookies.delete(STATE_COOKIE);
    if (cookie) response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  };

  const state = request.nextUrl.searchParams.get("state") ?? "";
  if (!saved || !state || !sameText(state, saved.state)) return back("failed");
  const session = await auth();
  if (!session?.user.id || session.user.id !== saved.user) return back("failed");
  if (request.nextUrl.searchParams.get("error")) return back("denied");
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return back("failed");

  try {
    const token = await exchangeCode(saved.provider, code, saved.redirectUri, saved.verifier);
    const account = await accountName(saved.provider, token);
    const supabase = await userSupabase();
    if (!supabase) return back("failed");
    const { error } = await supabase.rpc("org_connect_git", { org: saved.org, provider: saved.provider, account });
    if (error) {
      const failure = orgFailure(error);
      return back(typeof failure !== "string" && failure.key === "org.forbidden" ? "forbidden" : "failed");
    }
    const secure = saved.redirectUri.startsWith("https://");
    return back("connected", tokensCookie(request.cookies.get(TOKENS_COOKIE)?.value, saved.user, saved.provider, { token, account }, secure));
  } catch (error) {
    console.error("git callback", saved.provider, error);
    return back("failed");
  }
}
