import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { authorizeUrl } from "@/modules/git/providers";
import { randomText, sameText } from "@/modules/git/seal";
import {
  accountName, exchangeCode, githubAppSlug, githubInstallation, gitClient, readState, requestOrigin, STATE_COOKIE, stateCookie, tokensCookie, TOKENS_COOKIE,
} from "@/modules/git/server";
import { looksLikeLocale } from "@/modules/i18n/render";
import { orgFailure } from "@/modules/organizations/rules";
import { userSupabase } from "@/modules/supabase/server";

type Outcome = "connected" | "denied" | "requested" | "forbidden" | "failed";

/** A volta do provedor git (o mesmo endereço nos apps do GitLab e do
 * Bitbucket e na Callback URL e Setup URL do GitHub App). Confere o `state` com o cookie e a pessoa com a sessão,
 * troca o código pelo token, grava no banco qual conta foi conectada
 * (`org_connect_git`, só o owner) e guarda o token só no cookie cifrado. A
 * organização abre na aba de repositórios com o resultado em `git`.
 *
 * GitHub (só por GitHub App), em dois passos: a tela do GitHub (conta ou organização e quais
 * repositórios) volta aqui com `installation_id`; a rota guarda a instalação
 * no cookie e pede a autorização da pessoa, que volta com o `code`. A
 * instalação só vale se a pessoa a alcança, e o dono dela (conta ou
 * organização) vira a organização do provedor desta organização do JayV. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
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

  if (!saved) return back("failed");
  const session = await auth();
  if (!session?.user.id || session.user.id !== saved.user) return back("failed");
  const code = params.get("code");
  const state = params.get("state") ?? "";
  // O GitHub é só por GitHub App: sem ele configurado, não há volta válida.
  const app = saved.provider === "github";
  if (app && !githubAppSlug()) return back("failed");
  const fromInstall = !!params.get("installation_id") && !sameText(state, saved.state);

  // GitHub App, primeiro passo: voltou da tela de instalação. A instalação
  // fica no cookie e a pessoa autoriza o app; o `state` novo é conferido na
  // volta com o código. O id não é confiável ainda: é conferido com o token.
  // Um código que veio da instalação sem o nosso `state` (o app pedindo a
  // autorização durante a instalação) é descartado: a autorização é pedida
  // de novo, com o `state` conferido.
  if (app && (!code || fromInstall)) {
    if (params.get("setup_action") === "request") return back("requested");
    const installation = Number(params.get("installation_id"));
    const client = gitClient("github");
    if (!Number.isSafeInteger(installation) || installation <= 0 || !client) return back(params.get("error") ? "denied" : "failed");
    const next = { ...saved, state: randomText(24), installation };
    const response = NextResponse.redirect(authorizeUrl("github", client.id, saved.redirectUri, next.state));
    const cookie = stateCookie(next);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  }

  if (!state || !sameText(state, saved.state)) return back("failed");
  if (params.get("error")) return back("denied");
  if (!code) return back("failed");

  try {
    const token = await exchangeCode(saved.provider, code, saved.redirectUri, saved.verifier);
    const account = await accountName(saved.provider, token);
    // Com o GitHub App, a instalação escolhida na tela do GitHub (a guardada
    // no primeiro passo, ou a que veio junto com o código).
    const installation = app ? saved.installation || Number(params.get("installation_id")) || null : null;
    const owner = installation ? await githubInstallation(token, installation) : null;
    if (app && !owner) return back("failed");
    const supabase = await userSupabase();
    if (!supabase) return back("failed");
    const connected = await supabase.rpc("org_connect_git", { org: saved.org, provider: saved.provider, account });
    const chosen = connected.error || !owner
      ? connected
      : await supabase.rpc("org_choose_git_namespace", { org: saved.org, provider: saved.provider, namespace: owner.namespace });
    if (chosen.error) {
      const failure = orgFailure(chosen.error);
      return back(typeof failure !== "string" && failure.key === "org.forbidden" ? "forbidden" : "failed");
    }
    const secure = saved.redirectUri.startsWith("https://");
    const entry = { token, account, ...(installation ? { installation } : {}) };
    return back("connected", tokensCookie(request.cookies.get(TOKENS_COOKIE)?.value, saved.user, saved.org, saved.provider, entry, secure));
  } catch (error) {
    console.error("git callback", saved.provider, error);
    return back("failed");
  }
}
