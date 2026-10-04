import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { LOCALE_COOKIE, looksLikeLocale, pickLocale } from "@/modules/i18n/render";
import { SUPABASE_KEY, SUPABASE_URL } from "@/modules/supabase/config";

/** Os idiomas da tabela `locales`, relidos a cada dez minutos. */
const TTL = 10 * 60 * 1000;
let cached: { at: number; ids: string[] } | null = null;

async function localeIds() {
  if (cached && Date.now() - cached.at < TTL) return cached.ids;
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/locales?select=id`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    if (!response.ok) throw new Error(String(response.status));
    const ids = ((await response.json()) as { id: string }[]).map((row) => row.id);
    cached = { at: Date.now(), ids: ids.length ? ids : ["en"] };
  } catch (error) {
    // Sem o Supabase, vale a última lista (ou só o inglês) por um minuto, para
    // não bater nele a cada visita enquanto estiver fora.
    console.error("proxy locales", error);
    cached = { at: Date.now() - TTL + 60_000, ids: cached?.ids ?? ["en"] };
  }
  return cached.ids;
}

/** Toda página mora sob o idioma (`/pt-BR/admin`). O endereço sem ele vai
 * para o idioma salvo no cookie, ou o que o navegador pede. Embrulhado no
 * `auth` do NextAuth, que renova a sessão do Supabase a cada visita. */
export default auth(async (request) => {
  const { pathname, search } = request.nextUrl;
  if (looksLikeLocale(pathname.split("/")[1])) return NextResponse.next();
  const locale = pickLocale(await localeIds(), request.cookies.get(LOCALE_COOKIE)?.value, request.headers.get("accept-language"));
  return NextResponse.redirect(new URL(`/${locale}${pathname === "/" ? "" : pathname}${search}`, request.url));
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
