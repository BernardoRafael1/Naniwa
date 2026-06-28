import { useCallback, useState } from "react";
import {
  applyTheme,
  getStoredTheme,
  storeTheme,
  type Theme,
} from "../lib/theme";

/**
 * Gerencia o tema atual (claro/escuro). O tema é aplicado no elemento raiz
 * via `data-theme` e persistido em localStorage.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
    storeTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      applyTheme(next);
      storeTheme(next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme };
}
