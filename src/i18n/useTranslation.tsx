import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "../contexts/AuthContext";
import { getMyPreferences } from "../services/user/preferencesApi";
import {
  type AppLanguage,
  DEFAULT_APP_LANGUAGE,
  normalizeLanguage,
} from "./i18nTypes";
import { translations, type TranslationKey } from "./translations";

type TranslateParams = Record<string, string | number>;

type I18nContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: TranslationKey, params?: TranslateParams) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

type I18nProviderProps = {
  children: ReactNode;
};

export function I18nProvider({ children }: I18nProviderProps) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [language, setLanguage] = useState<AppLanguage>(DEFAULT_APP_LANGUAGE);

  // Carrega o idioma preferido do usuário logado; deslogado usa pt-br.
  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      setLanguage(DEFAULT_APP_LANGUAGE);
      return;
    }

    let isActive = true;

    getMyPreferences(user.id)
      .then((preferences) => {
        if (isActive) {
          setLanguage(normalizeLanguage(preferences?.default_language));
        }
      })
      .catch((error) => {
        console.error(error);
        if (isActive) {
          setLanguage(DEFAULT_APP_LANGUAGE);
        }
      });

    return () => {
      isActive = false;
    };
  }, [user?.id, isAuthLoading]);

  const t = useCallback(
    (key: TranslationKey, params?: TranslateParams) => {
      const fallback = translations[DEFAULT_APP_LANGUAGE];
      let text = translations[language][key] ?? fallback[key] ?? key;

      if (params) {
        for (const [name, value] of Object.entries(params)) {
          text = text.replace(new RegExp(`\\{${name}\\}`, "g"), String(value));
        }
      }

      return text;
    },
    [language]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage, t }),
    [language, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useTranslation precisa ser usado dentro de I18nProvider.");
  }

  return context;
}
