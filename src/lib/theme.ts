export type Theme = "light" | "dark";

const STORAGE_KEY = "naniwa-theme";

/** Lê o tema salvo no localStorage, caindo para "light" por padrão. */
export function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    /* localStorage indisponível — ignora e usa o padrão. */
  }

  return "light";
}

/** Aplica o tema no elemento raiz via atributo `data-theme`. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

/** Persiste a preferência de tema. */
export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* Sem persistência disponível — segue apenas em memória. */
  }
}

/** Aplica imediatamente o tema salvo, evitando "flash" no carregamento. */
export function initTheme(): void {
  applyTheme(getStoredTheme());
}
