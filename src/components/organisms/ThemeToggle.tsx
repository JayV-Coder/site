"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/modules/i18n";
import { setThemePreference, useTheme } from "@/modules/theme";

/** Troca entre claro e escuro num clique, no cabeçalho de toda página. Antes
 * do primeiro clique, vale o tema do sistema. */
export function ThemeToggle() {
  const t = useT();
  const theme = useTheme((state) => state.theme);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <Button variant="ghost" size="icon-sm" aria-label={t(next === "dark" ? "theme.dark" : "theme.light")} title={t("theme.label")} onClick={() => setThemePreference(next)}>
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
