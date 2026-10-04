"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { render } from "./render";
import type { Key, Locale, LocaleOption, Messages, Params, Text } from "./types";

interface I18nValue { locale: Locale; locales: LocaleOption[]; messages: Messages }

const I18nContext = createContext<I18nValue>({ locale: "en", locales: [], messages: {} });

/** O servidor já leu o idioma da página e as traduções dele: o cliente só
 * recebe o dicionário pronto, sem pedir nada ao Supabase. */
export function I18nProvider({ locale, locales, messages, children }: I18nValue & { children: ReactNode }) {
  return <I18nContext.Provider value={{ locale, locales, messages }}>{children}</I18nContext.Provider>;
}

/** O texto no idioma da página, para componentes do cliente. */
export function useT() {
  const { locale, messages } = useContext(I18nContext);
  return useCallback((key: Key, params?: Params) => render(locale, messages, key, params), [locale, messages]);
}

/** O texto de um erro que já veio como chave (`{ key, params }`). */
export function useSay() {
  const t = useT();
  return useCallback((text: Text) => t(text.key as Key, text.params), [t]);
}

export function useLocale() {
  return useContext(I18nContext).locale;
}

export function useLocales() {
  return useContext(I18nContext).locales;
}

/** O caminho no idioma da página: `/pt-BR/admin`. */
export function useHref() {
  const locale = useLocale();
  return useCallback((path: string) => `/${locale}${path === "/" ? "" : path}`, [locale]);
}
