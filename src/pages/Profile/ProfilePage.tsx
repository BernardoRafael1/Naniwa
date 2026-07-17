import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sidebar } from "../../components/layout/Sidebar";
import { useAuth } from "../../contexts/AuthContext";
import {
  type AppLanguage,
  DEFAULT_APP_LANGUAGE,
  normalizeLanguage,
} from "../../i18n/i18nTypes";
import { useTranslation } from "../../i18n/useTranslation";
import { applyTheme, storeTheme, type Theme } from "../../lib/theme";
import {
  updateAuthEmail,
  updateAuthPassword,
  updateAuthUsername,
} from "../../services/auth/authApi";
import {
  getMyPreferences,
  updateMyPreferences,
} from "../../services/user/preferencesApi";
import { getMyProfile, updateMyProfile } from "../../services/user/profileApi";
import type {
  ReaderDirection,
  ReaderMode,
  ThemePreference,
} from "../../services/user/userTypes";

type ProfileTab = "conta" | "preferencias";

type PanelMessage = {
  error: string;
  success: string;
};

const EMPTY_MESSAGE: PanelMessage = { error: "", success: "" };

/**
 * Resolve a preferência de tema para um tema concreto (claro/escuro),
 * respeitando o sistema atual do dispositivo quando "system".
 */
function resolveTheme(preference: ThemePreference): Theme {
  if (preference === "light" || preference === "dark") {
    return preference;
  }

  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return prefersDark ? "dark" : "light";
}

export function ProfilePage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { t, setLanguage } = useTranslation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("conta");
  const [isLoading, setIsLoading] = useState(true);

  // Conta
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [initialUsername, setInitialUsername] = useState("");
  const [initialEmail, setInitialEmail] = useState("");
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [accountMessage, setAccountMessage] =
    useState<PanelMessage>(EMPTY_MESSAGE);

  // Preferências
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [languageChoice, setLanguageChoice] =
    useState<AppLanguage>(DEFAULT_APP_LANGUAGE);
  const [readerMode, setReaderMode] = useState<ReaderMode>("single-page");
  const [readerDirection, setReaderDirection] =
    useState<ReaderDirection>("ltr");
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState<PanelMessage>(EMPTY_MESSAGE);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      setIsLoading(false);
      return;
    }

    let isActive = true;
    const currentUserId = user.id;

    setUsername(user.name ?? "");
    setInitialUsername(user.name ?? "");
    setEmail(user.email ?? "");
    setInitialEmail(user.email ?? "");

    async function loadUserData() {
      try {
        setIsLoading(true);

        const [profile, preferences] = await Promise.all([
          getMyProfile(currentUserId),
          getMyPreferences(currentUserId),
        ]);

        if (!isActive) {
          return;
        }

        if (profile) {
          setDisplayName(profile.display_name ?? "");
        }

        if (preferences) {
          setTheme(preferences.theme);
          setLanguageChoice(normalizeLanguage(preferences.default_language));
          setReaderMode(preferences.reader_mode);
          setReaderDirection(preferences.reader_direction);
        }
      } catch (error) {
        console.error(error);
        if (isActive) {
          setAccountMessage({ error: t("profile.loadError"), success: "" });
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadUserData();

    return () => {
      isActive = false;
    };
  }, [user?.id, isAuthLoading]);

  function handleThemeChange(value: ThemePreference) {
    setTheme(value);

    // Aplica o tema imediatamente para dar feedback visual instantâneo.
    const resolved = resolveTheme(value);
    applyTheme(resolved);
    storeTheme(resolved);
  }

  async function handleSaveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const emailChanged = trimmedEmail !== initialEmail;

    // Nome de usuário é obrigatório; nome de exibição pode ficar vazio.
    if (!trimmedUsername) {
      setAccountMessage({ error: t("profile.usernameRequired"), success: "" });
      return;
    }

    setIsSavingAccount(true);
    setAccountMessage(EMPTY_MESSAGE);

    try {
      if (trimmedUsername !== initialUsername) {
        await updateAuthUsername(trimmedUsername);
        setInitialUsername(trimmedUsername);
      }

      await updateMyProfile(user.id, {
        // Vazio é permitido — nesse caso o padrão passa a ser o nome de usuário.
        display_name: displayName.trim(),
      });

      if (emailChanged && trimmedEmail) {
        await updateAuthEmail(trimmedEmail);
      }

      if (newPassword) {
        await updateAuthPassword(newPassword);
        setNewPassword("");
      }

      setAccountMessage({
        error: "",
        success: emailChanged
          ? t("profile.accountSavedEmail")
          : t("profile.accountSaved"),
      });
    } catch (error) {
      console.error(error);
      setAccountMessage({ error: t("profile.accountError"), success: "" });
    } finally {
      setIsSavingAccount(false);
    }
  }

  async function handleSavePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setIsSavingPrefs(true);
    setPrefsMessage(EMPTY_MESSAGE);

    try {
      await updateMyPreferences(user.id, {
        theme,
        default_language: languageChoice,
        reader_mode: readerMode,
        reader_direction: readerDirection,
      });

      // Aplica idioma e tema ao layout imediatamente após salvar.
      setLanguage(languageChoice);

      const resolvedTheme = resolveTheme(theme);
      applyTheme(resolvedTheme);
      storeTheme(resolvedTheme);

      setPrefsMessage({ error: "", success: t("profile.preferencesSaved") });
    } catch (error) {
      console.error(error);
      setPrefsMessage({ error: t("profile.preferencesError"), success: "" });
    } finally {
      setIsSavingPrefs(false);
    }
  }

  const avatarLetter = (username || user?.email || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="app-shell">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <header className="home-topbar">
        <button
          type="button"
          className="icon-button"
          aria-label="Menu"
          onClick={() => setIsSidebarOpen(true)}
        >
          <span className="icon-button__bars" />
        </button>

        <div className="home-topbar__spacer" />
      </header>

      <main className="profile container">
        <section className="home-welcome">
          <h1 className="home-welcome__title">{t("profile.welcomeTitle")}</h1>
          <p className="home-welcome__subtitle">
            {t("profile.welcomeSubtitle")}
          </p>
        </section>

        {!isAuthenticated ? (
          <div className="empty-state">
            <span className="empty-state__icon">🔒</span>
            <p className="empty-state__title">
              {t("profile.loggedOutTitle")}
            </p>
            <p className="empty-state__text">{t("profile.loggedOutText")}</p>
            <Link className="btn btn--primary" to="/login">
              {t("auth.login")}
            </Link>
          </div>
        ) : isLoading ? (
          <div className="loading">
            <div className="spinner" />
            <p className="loading__text">{t("profile.loading")}</p>
          </div>
        ) : (
          <div className="profile-layout">
            <nav className="profile-tabs" aria-label={t("profile.welcomeTitle")}>
              <button
                type="button"
                className={`profile-tab ${
                  activeTab === "conta" ? "profile-tab--active" : ""
                }`}
                onClick={() => setActiveTab("conta")}
              >
                {t("profile.tabAccount")}
              </button>

              <button
                type="button"
                className={`profile-tab ${
                  activeTab === "preferencias" ? "profile-tab--active" : ""
                }`}
                onClick={() => setActiveTab("preferencias")}
              >
                {t("profile.tabPreferences")}
              </button>
            </nav>

            <div className="profile-panel">
              {activeTab === "conta" ? (
                <form className="profile-card" onSubmit={handleSaveAccount}>
                  <div className="profile-account-head">
                    <div className="profile-avatar" aria-hidden="true">
                      {avatarLetter}
                    </div>
                    <div className="profile-account-head__info">
                      <span className="profile-account-head__name">
                        {username || t("profile.noUsername")}
                      </span>
                      <span className="profile-account-head__email">
                        {user?.email}
                      </span>
                    </div>
                  </div>

                  <label className="profile-field">
                    <span>{t("profile.usernameLabel")}</span>
                    <input
                      className="input"
                      type="text"
                      placeholder={t("profile.usernamePlaceholder")}
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                    />
                  </label>

                  <label className="profile-field">
                    <span>{t("profile.displayNameLabel")}</span>
                    <input
                      className="input"
                      type="text"
                      placeholder={t("profile.displayNamePlaceholder")}
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                    />
                  </label>

                  <label className="profile-field">
                    <span>{t("profile.emailLabel")}</span>
                    <input
                      className="input"
                      type="email"
                      placeholder={t("profile.emailPlaceholder")}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </label>

                  <label className="profile-field">
                    <span>{t("profile.newPasswordLabel")}</span>
                    <input
                      className="input"
                      type="password"
                      placeholder={t("profile.newPasswordPlaceholder")}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      minLength={6}
                    />
                  </label>

                  {accountMessage.error && (
                    <p className="auth-error" role="alert">
                      {accountMessage.error}
                    </p>
                  )}

                  {accountMessage.success && (
                    <p className="profile-success" role="status">
                      {accountMessage.success}
                    </p>
                  )}

                  <div className="profile-actions">
                    <button
                      className="btn btn--primary"
                      type="submit"
                      disabled={isSavingAccount}
                    >
                      {isSavingAccount
                        ? t("common.saving")
                        : t("profile.saveChanges")}
                    </button>
                  </div>
                </form>
              ) : (
                <form
                  className="profile-card"
                  onSubmit={handleSavePreferences}
                >
                  <h2 className="profile-card__title">
                    {t("profile.preferencesTitle")}
                  </h2>

                  <label className="profile-field">
                    <span>{t("profile.themeLabel")}</span>
                    <select
                      className="input"
                      value={theme}
                      onChange={(event) =>
                        handleThemeChange(
                          event.target.value as ThemePreference
                        )
                      }
                    >
                      <option value="system">{t("profile.themeSystem")}</option>
                      <option value="light">{t("profile.themeLight")}</option>
                      <option value="dark">{t("profile.themeDark")}</option>
                    </select>
                  </label>

                  <label className="profile-field">
                    <span>{t("profile.languageLabel")}</span>
                    <select
                      className="input"
                      value={languageChoice}
                      onChange={(event) =>
                        setLanguageChoice(event.target.value as AppLanguage)
                      }
                    >
                      <option value="pt-br">Português</option>
                      <option value="en">English</option>
                    </select>
                  </label>

                  <label className="profile-field">
                    <span>{t("profile.readerModeLabel")}</span>
                    <select
                      className="input"
                      value={readerMode}
                      onChange={(event) =>
                        setReaderMode(event.target.value as ReaderMode)
                      }
                    >
                      <option value="single-page">
                        {t("profile.readerModeSingle")}
                      </option>
                      <option value="continuous">
                        {t("profile.readerModeContinuous")}
                      </option>
                    </select>
                  </label>

                  <label className="profile-field">
                    <span>{t("profile.readerDirectionLabel")}</span>
                    <select
                      className="input"
                      value={readerDirection}
                      onChange={(event) =>
                        setReaderDirection(
                          event.target.value as ReaderDirection
                        )
                      }
                    >
                      <option value="ltr">
                        {t("profile.readerDirectionLtr")}
                      </option>
                      <option value="rtl">
                        {t("profile.readerDirectionRtl")}
                      </option>
                    </select>
                  </label>

                  {prefsMessage.error && (
                    <p className="auth-error" role="alert">
                      {prefsMessage.error}
                    </p>
                  )}

                  {prefsMessage.success && (
                    <p className="profile-success" role="status">
                      {prefsMessage.success}
                    </p>
                  )}

                  <div className="profile-actions">
                    <button
                      className="btn btn--primary"
                      type="submit"
                      disabled={isSavingPrefs}
                    >
                      {isSavingPrefs
                        ? t("common.saving")
                        : t("profile.savePreferences")}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
