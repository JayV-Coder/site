"use client";

import { create } from "zustand";

export type ThemePreference = "system" | "light" | "dark";
export type Theme = "light" | "dark";

export { THEME_KEY } from "./boot";
import { THEME_KEY } from "./boot";

interface ThemeState { preference: ThemePreference; theme: Theme }

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
  } catch {
    // Navegador sem armazenamento (aba anônima bloqueada): fica o do sistema.
  }
  return "system";
}

const systemDark = () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
const resolve = (preference: ThemePreference): Theme => (preference === "system" ? (systemDark() ? "dark" : "light") : preference);

export const useTheme = create<ThemeState>(() => ({ preference: "system", theme: "light" }));

function apply(preference: ThemePreference) {
  const theme = resolve(preference);
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  useTheme.setState({ preference, theme });
}

/** Lê a escolha salva e acompanha o sistema enquanto ela for "sistema". */
export function connectTheme() {
  apply(readPreference());
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => { if (useTheme.getState().preference === "system") apply("system"); };
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function setThemePreference(preference: ThemePreference) {
  try { localStorage.setItem(THEME_KEY, preference); } catch { /* sem armazenamento */ }
  apply(preference);
}
