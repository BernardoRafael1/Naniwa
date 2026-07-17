export type AppLanguage = "pt-br" | "en";

export const APP_LANGUAGES: AppLanguage[] = ["pt-br", "en"];

export const DEFAULT_APP_LANGUAGE: AppLanguage = "pt-br";

/**
 * Normaliza um valor vindo do banco (user_preferences.default_language) para
 * um idioma válido do app. Qualquer valor fora de "en" cai para "pt-br".
 */
export function normalizeLanguage(
  value: string | null | undefined
): AppLanguage {
  return value === "en" ? "en" : DEFAULT_APP_LANGUAGE;
}
