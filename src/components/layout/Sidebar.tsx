import { useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../hooks/useTheme";
import { ThemeToggle } from "./ThemeToggle";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const HomeIcon = (
  <Icon>
    <path d="M3.5 11 12 4l8.5 7" />
    <path d="M5.5 9.5V20h13V9.5" />
    <path d="M10 20v-5h4v5" />
  </Icon>
);

const LibraryIcon = (
  <Icon>
    <path d="M6 4h10a1 1 0 0 1 1 1v15H7a1 1 0 0 1-1-1V4Z" />
    <path d="M6 4a2 2 0 0 0-2 2v12" />
    <path d="M10 8h4" />
  </Icon>
);

const SearchIcon = (
  <Icon>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-3.6-3.6" />
  </Icon>
);

const CommunityIcon = (
  <Icon>
    <circle cx="9" cy="9.5" r="3.2" />
    <path d="M3.5 19a5.6 5.6 0 0 1 11 0" />
    <path d="M16 7a3 3 0 0 1 0 5.6" />
    <path d="M17.5 19a5.6 5.6 0 0 0-2.2-3.9" />
  </Icon>
);

const ProfileIcon = (
  <Icon>
    <circle cx="12" cy="8.5" r="3.4" />
    <path d="M5 19.5a7 7 0 0 1 14 0" />
  </Icon>
);

const LoginIcon = (
  <Icon>
    <path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" />
    <path d="M10 12H3" />
    <path d="m6.5 8.5 3.5 3.5-3.5 3.5" />
  </Icon>
);

const RegisterIcon = (
  <Icon>
    <circle cx="10" cy="8.5" r="3.2" />
    <path d="M4 19a6 6 0 0 1 12 0" />
    <path d="M18 7v6" />
    <path d="M21 10h-6" />
  </Icon>
);

const LogoutIcon = (
  <Icon>
    <path d="M10 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" />
    <path d="M14 12h7" />
    <path d="m17.5 8.5 3.5 3.5-3.5 3.5" />
  </Icon>
);

type NavItem = {
  label: string;
  icon: ReactNode;
  to?: string;
  disabled?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Início", icon: HomeIcon, to: "/" },
  { label: "Biblioteca", icon: LibraryIcon, to: "/library" },
  { label: "Perfil", icon: ProfileIcon, to: "/profile" },
  { label: "Pesquisa avançada", icon: SearchIcon, disabled: true },
  { label: "Comunidade", icon: CommunityIcon, disabled: true },
];

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    onClose();
    navigate("/", { replace: true });
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? "sidebar-overlay--open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`sidebar ${isOpen ? "sidebar--open" : ""}`}
        aria-hidden={!isOpen}
      >
        <div className="sidebar__brand">
          <span className="sidebar__logo">凪</span>
          <span className="sidebar__brand-name">Naniwa</span>
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map((item) => {
            if (item.disabled || !item.to) {
              return (
                <button
                  key={item.label}
                  type="button"
                  className="sidebar__link"
                  disabled
                >
                  <span className="sidebar__link-icon">{item.icon}</span>
                  <span>{item.label}</span>
                  <span className="sidebar__soon">em breve</span>
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                to={item.to}
                className="sidebar__link"
                onClick={onClose}
              >
                <span className="sidebar__link-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__auth">
            {isAuthenticated && user ? (
              <>
                <div className="sidebar__user">
                  <span className="sidebar__user-avatar">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="sidebar__user-info">
                    <span className="sidebar__user-name">{user.name}</span>
                    <span className="sidebar__user-email">{user.email}</span>
                  </span>
                </div>

                <button
                  type="button"
                  className="sidebar__link"
                  onClick={handleLogout}
                >
                  <span className="sidebar__link-icon">{LogoutIcon}</span>
                  <span>Sair</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="sidebar__link"
                  onClick={onClose}
                >
                  <span className="sidebar__link-icon">{LoginIcon}</span>
                  <span>Entrar</span>
                </Link>

                <Link
                  to="/register"
                  className="sidebar__link"
                  onClick={onClose}
                >
                  <span className="sidebar__link-icon">{RegisterIcon}</span>
                  <span>Criar conta</span>
                </Link>
              </>
            )}
          </div>

          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </aside>
    </>
  );
}
