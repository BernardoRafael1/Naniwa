import { type FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "../../i18n/useTranslation";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="auth-loading">{t("auth.loadingSession")}</p>
        </section>
      </main>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      await login({
        email,
        password,
      });

      navigate("/", {
        replace: true,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("login.error");

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-badge">Naniwa</span>
          <h1>{t("login.title")}</h1>
          <p>{t("login.subtitle")}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>{t("login.emailLabel")}</span>
            <input
              type="email"
              placeholder={t("login.emailPlaceholder")}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="auth-field">
            <span>{t("login.passwordLabel")}</span>
            <input
              type="password"
              placeholder={t("login.passwordPlaceholder")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {errorMessage && <p className="auth-error">{errorMessage}</p>}

          <button
            className="auth-submit"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? t("login.submitting") : t("login.submit")}
          </button>
        </form>

        <p className="auth-alt">
          {t("login.noAccount")}{" "}
          <Link to="/register">{t("login.createAccount")}</Link>
        </p>

        <Link className="auth-back" to="/">
          {t("common.backToHome")}
        </Link>
      </section>
    </main>
  );
}