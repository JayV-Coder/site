import "server-only";
import { cache } from "react";
import { SUPABASE_KEY, SUPABASE_URL } from "@/modules/supabase/config";
import { en } from "./messages/en";
import { BUILT_IN, FALLBACK, render } from "./render";
import type { Key, Locale, LocaleOption, Messages, Params } from "./types";

/** Quanto tempo uma tradução lida do Supabase vale antes de ler de novo. */
const REVALIDATE = 300;
/** O PostgREST devolve no máximo 1000 linhas por consulta (`max_rows`): um
 * idioma inteiro passa disso, então lê página por página, como o núcleo do
 * app (`all_pages` em `jayv-cloud/src/remote.rs`). */
const PAGE = 1000;
const MAX_PAGES = 20;

async function rest<T>(path: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    next: { revalidate: REVALIDATE, tags: ["translations"] },
  });
  if (!response.ok) throw new Error(`supabase ${path}: ${response.status}`);
  return response.json() as Promise<T>;
}

/** Os idiomas da tabela `locales`; sem rede, só o inglês embutido. */
export const getLocales = cache(async (): Promise<LocaleOption[]> => {
  try {
    const rows = await rest<{ id: string; name: string; rtl: boolean }[]>("locales?select=id,name,rtl&order=position.asc,id.asc");
    return rows.length ? rows.map((row) => ({ id: row.id, name: row.name, rtl: row.rtl })) : BUILT_IN;
  } catch (error) {
    console.error("i18n locales", error);
    return BUILT_IN;
  }
});

/** Os grupos de chave que o site usa (`site.*` e as que ele divide com o
 * app, como `auth.*` e `admin.*`): só eles descem, não o idioma inteiro. */
const PREFIXES = [...new Set(Object.keys(en).map((key) => key.split(".")[0]))];

/** As traduções de um idioma para as chaves do site. O inglês não desce: ele
 * é o `en.ts`. Sem rede, volta vazio e vale o inglês. */
export const getMessages = cache(async (locale: Locale): Promise<Messages> => {
  if (locale === FALLBACK) return {};
  const filter = `or=(${PREFIXES.map((prefix) => `key.like.${prefix}.*`).join(",")})`;
  const messages: Messages = {};
  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const rows = await rest<{ key: string; value: Messages[Key] }[]>(
        `translations?select=key,value&locale=eq.${encodeURIComponent(locale)}&${filter}&order=key.asc&limit=${PAGE}&offset=${page * PAGE}`,
      );
      // Não para numa página menor que `PAGE`: o servidor pode ter um
      // `max_rows` menor, e a página cheia dele pareceria a última.
      if (!rows.length) break;
      for (const row of rows) if (row.key in en) messages[row.key as Key] = row.value;
    }
  } catch (error) {
    console.error("i18n translations", locale, error);
  }
  return messages;
});

/** O texto no idioma da página, para componentes do servidor. */
export async function getT(locale: Locale) {
  const messages = await getMessages(locale);
  return (key: Key, params?: Params) => render(locale, messages, key, params);
}

/** O idioma existe na tabela? */
export async function knownLocale(locale: Locale) {
  const locales = await getLocales();
  return locales.find((option) => option.id === locale) ?? null;
}
