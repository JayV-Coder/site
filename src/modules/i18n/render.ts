import { en } from "./messages/en";
import type { Key, Locale, LocaleOption, Message, Messages, Params, Text } from "./types";

export const FALLBACK: Locale = "en";
/** O inglês vem no build; os outros idiomas chegam do Supabase. */
export const BUILT_IN: LocaleOption[] = [{ id: FALLBACK, name: "English" }];
/** O cookie com o idioma escolhido no seletor (o app guarda o seu em
 * `localStorage`, que o servidor não lê). */
export const LOCALE_COOKIE = "jayv.locale";

/** O texto no idioma pedido; o que faltar sai de `en`, e a chave que nem o
 * inglês conhece aparece como está. */
export function render(locale: Locale, messages: Messages, key: Key, params?: Params): string {
  const message: Message | undefined = messages[key] ?? en[key];
  if (message === undefined) return key;
  const text = typeof message === "string"
    ? message
    : message[new Intl.PluralRules(locale).select(Number(params?.count ?? 0))] ?? message.other;
  return text.replace(/\{(\w+)\}/g, (mark, name: string) => (params && name in params ? String(params[name]) : mark));
}

export function isText(value: unknown): value is Text {
  return typeof value === "object" && value !== null && typeof (value as Text).key === "string";
}

/** O idioma que a pessoa pede (cookie, depois `Accept-Language`) entre os que
 * o JayV sabe falar: `pt-PT` cai em `pt-BR`, `zh-TW` em `zh-CN`. */
export function pickLocale(available: string[], saved: string | undefined, acceptLanguage: string | null): Locale {
  if (saved && available.includes(saved)) return saved;
  const wanted = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...rest] = part.trim().split(";");
      const q = rest.find((item) => item.trim().startsWith("q="));
      return { tag: tag.trim(), q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter((item) => item.tag && item.tag !== "*" && !Number.isNaN(item.q))
    .sort((a, b) => b.q - a.q);
  for (const { tag } of wanted) {
    const exact = available.find((id) => id.toLowerCase() === tag.toLowerCase());
    if (exact) return exact;
    const language = tag.split("-")[0].toLowerCase();
    const near = available.find((id) => id.split("-")[0].toLowerCase() === language);
    if (near) return near;
  }
  return available.includes(FALLBACK) ? FALLBACK : available[0] ?? FALLBACK;
}

/** O primeiro pedaço do caminho tem cara de código de idioma (`pt-BR`,
 * `zh-CN`, `ja`)? */
export const looksLikeLocale = (segment: string | undefined) => !!segment && /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(segment);
