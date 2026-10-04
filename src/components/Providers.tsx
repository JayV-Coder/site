"use client";

import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider, type Locale, type LocaleOption, type Messages } from "@/modules/i18n";
import { connectTheme } from "@/modules/theme";

/** O que toda página do cliente precisa: o idioma já lido pelo servidor, o
 * tema e os avisos. */
export function Providers({ locale, locales, messages, children }: { locale: Locale; locales: LocaleOption[]; messages: Messages; children: ReactNode }) {
  useEffect(() => connectTheme(), []);
  return (
    <I18nProvider locale={locale} locales={locales} messages={messages}>
      {children}
      <Toaster position="bottom-right" />
    </I18nProvider>
  );
}
