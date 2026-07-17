import { useTranslation } from "../../i18n/useTranslation";
import type { Theme } from "../../lib/theme";

type ThemeToggleProps = {
  theme: Theme;
  onToggle: () => void;
};

const SunIcon = (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M17.7 6.3l1.4-1.4M4.9 19.1l1.4-1.4" />
  </svg>
);

const MoonIcon = (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 14.2A8 8 0 1 1 9.8 4 6.4 6.4 0 0 0 20 14.2Z" />
  </svg>
);

/** Alternador de tema usado no rodapé do menu lateral. */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const { t } = useTranslation();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-pressed={isDark}
    >
      <span className="theme-toggle__icon">{isDark ? MoonIcon : SunIcon}</span>
      <span className="theme-toggle__label">
        {isDark ? t("theme.dark") : t("theme.light")}
      </span>
      <span className={`theme-toggle__switch ${isDark ? "is-on" : ""}`}>
        <span className="theme-toggle__knob" />
      </span>
    </button>
  );
}
