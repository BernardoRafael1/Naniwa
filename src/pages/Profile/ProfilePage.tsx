import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sidebar } from "../../components/layout/Sidebar";
import { useAuth } from "../../contexts/AuthContext";
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
import {
  DEFAULT_LANGUAGE,
  type ReaderDirection,
  type ReaderMode,
  type ThemePreference,
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
  const [defaultLanguage, setDefaultLanguage] = useState(DEFAULT_LANGUAGE);
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
          setDefaultLanguage(preferences.default_language ?? DEFAULT_LANGUAGE);
          setReaderMode(preferences.reader_mode);
          setReaderDirection(preferences.reader_direction);
        }
      } catch (error) {
        console.error(error);
        if (isActive) {
          setAccountMessage({
            error: "Não foi possível carregar seus dados.",
            success: "",
          });
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
      setAccountMessage({
        error: "O nome de usuário não pode ser vazio.",
        success: "",
      });
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
          ? "Alterações salvas. Confirme o novo e-mail pelo link enviado."
          : "Alterações salvas com sucesso.",
      });
    } catch (error) {
      console.error(error);
      setAccountMessage({
        error: "Não foi possível salvar as alterações da conta.",
        success: "",
      });
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
        default_language: defaultLanguage,
        reader_mode: readerMode,
        reader_direction: readerDirection,
      });

      setPrefsMessage({
        error: "",
        success: "Preferências salvas com sucesso.",
      });
    } catch (error) {
      console.error(error);
      setPrefsMessage({
        error: "Não foi possível salvar as preferências.",
        success: "",
      });
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
          aria-label="Abrir menu"
          onClick={() => setIsSidebarOpen(true)}
        >
          <span className="icon-button__bars" />
        </button>

        <div className="home-topbar__spacer" />
      </header>

      <main className="profile container">
        <section className="home-welcome">
          <h1 className="home-welcome__title">Seu perfil</h1>
          <p className="home-welcome__subtitle">
            Gerencie sua conta e preferências de leitura.
          </p>
        </section>

        {!isAuthenticated ? (
          <div className="empty-state">
            <span className="empty-state__icon">🔒</span>
            <p className="empty-state__title">Entre para acessar seu perfil</p>
            <p className="empty-state__text">
              Faça login para editar sua conta e preferências.
            </p>
            <Link className="btn btn--primary" to="/login">
              Entrar
            </Link>
          </div>
        ) : isLoading ? (
          <div className="loading">
            <div className="spinner" />
            <p className="loading__text">Carregando seu perfil...</p>
          </div>
        ) : (
          <div className="profile-layout">
            <nav className="profile-tabs" aria-label="Seções do perfil">
              <button
                type="button"
                className={`profile-tab ${
                  activeTab === "conta" ? "profile-tab--active" : ""
                }`}
                onClick={() => setActiveTab("conta")}
              >
                Conta
              </button>

              <button
                type="button"
                className={`profile-tab ${
                  activeTab === "preferencias" ? "profile-tab--active" : ""
                }`}
                onClick={() => setActiveTab("preferencias")}
              >
                Preferências
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
                        {username || "Sem nome de usuário"}
                      </span>
                      <span className="profile-account-head__email">
                        {user?.email}
                      </span>
                    </div>
                  </div>

                  <label className="profile-field">
                    <span>Nome de usuário</span>
                    <input
                      className="input"
                      type="text"
                      placeholder="Seu nome de usuário"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                    />
                  </label>

                  <label className="profile-field">
                    <span>Nome de exibição</span>
                    <input
                      className="input"
                      type="text"
                      placeholder="Como quer ser exibido"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                    />
                  </label>

                  <label className="profile-field">
                    <span>E-mail</span>
                    <input
                      className="input"
                      type="email"
                      placeholder="seuemail@exemplo.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </label>

                  <label className="profile-field">
                    <span>Nova senha</span>
                    <input
                      className="input"
                      type="password"
                      placeholder="Deixe em branco para manter a atual"
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
                      {isSavingAccount ? "Salvando..." : "Salvar alterações"}
                    </button>
                  </div>
                </form>
              ) : (
                <form
                  className="profile-card"
                  onSubmit={handleSavePreferences}
                >
                  <h2 className="profile-card__title">Preferências</h2>

                  <label className="profile-field">
                    <span>Tema</span>
                    <select
                      className="input"
                      value={theme}
                      onChange={(event) =>
                        handleThemeChange(
                          event.target.value as ThemePreference
                        )
                      }
                    >
                      <option value="system">Sistema</option>
                      <option value="light">Claro</option>
                      <option value="dark">Escuro</option>
                    </select>
                  </label>

                  <label className="profile-field">
                    <span>Idioma padrão</span>
                    <select
                      className="input"
                      value={defaultLanguage}
                      onChange={(event) =>
                        setDefaultLanguage(event.target.value)
                      }
                    >
                      <option value="pt-br">Português (BR)</option>
                      <option value="en">Inglês</option>
                      <option value="es">Espanhol</option>
                    </select>
                  </label>

                  <label className="profile-field">
                    <span>Modo de leitura</span>
                    <select
                      className="input"
                      value={readerMode}
                      onChange={(event) =>
                        setReaderMode(event.target.value as ReaderMode)
                      }
                    >
                      <option value="single-page">Página única</option>
                      <option value="continuous">Contínuo</option>
                    </select>
                  </label>

                  <label className="profile-field">
                    <span>Direção de leitura</span>
                    <select
                      className="input"
                      value={readerDirection}
                      onChange={(event) =>
                        setReaderDirection(
                          event.target.value as ReaderDirection
                        )
                      }
                    >
                      <option value="ltr">Esquerda → Direita</option>
                      <option value="rtl">Direita → Esquerda</option>
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
                      {isSavingPrefs ? "Salvando..." : "Salvar preferências"}
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
