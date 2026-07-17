import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sidebar } from "../../components/layout/Sidebar";
import { MangaCover } from "../../components/MangaCover";
import { useAuth } from "../../contexts/AuthContext";
import { LIBRARY_STATUS_LABEL_KEY } from "../../i18n/libraryStatus";
import type { TranslationKey } from "../../i18n/translations";
import { useTranslation } from "../../i18n/useTranslation";
import { resolveCoverImageUrl } from "../../services/mangadex/mangadexHelpers";
import { getMyLibraryItems } from "../../services/library/libraryApi";
import {
  LIBRARY_STATUSES,
  normalizeLibraryStatus,
  type LibraryItem,
  type LibraryStatus,
} from "../../services/library/libraryTypes";

type LibraryTab = "all" | LibraryStatus;

const LIBRARY_TABS: { key: LibraryTab; labelKey: TranslationKey }[] = [
  { key: "all", labelKey: "library.tabAll" },
  ...LIBRARY_STATUSES.map((status) => ({
    key: status,
    labelKey: LIBRARY_STATUS_LABEL_KEY[status],
  })),
];

function formatLastRead(
  lastReadAt: string | null,
  locale: string
): string | null {
  if (!lastReadAt) {
    return null;
  }

  const date = new Date(lastReadAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function LibraryPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { t, language } = useTranslation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState<LibraryTab>("all");

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    let isActive = true;
    const currentUserId = user.id;

    async function loadLibrary() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const libraryItems = await getMyLibraryItems(currentUserId);

        if (isActive) {
          setItems(libraryItems);
        }
      } catch (error) {
        console.error(error);
        if (isActive) {
          setErrorMessage(t("library.error"));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadLibrary();

    return () => {
      isActive = false;
    };
  }, [user?.id, isAuthLoading]);

  // Agrupa os itens pelas seções oficiais, normalizando status antigos.
  const groupedItems = useMemo(() => {
    const groups: Record<LibraryStatus, LibraryItem[]> = {
      reading: [],
      planned: [],
      completed: [],
      dropped: [],
    };

    for (const item of items) {
      groups[normalizeLibraryStatus(item.status)].push(item);
    }

    return groups;
  }, [items]);

  const locale = language === "en" ? "en-US" : "pt-BR";

  const visibleItems =
    activeTab === "all" ? items : groupedItems[activeTab];

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

      <main className="library container">
        <section className="home-welcome">
          <h1 className="home-welcome__title">{t("library.welcomeTitle")}</h1>
          <p className="home-welcome__subtitle">
            {t("library.welcomeSubtitle")}
          </p>
        </section>

        {!isAuthenticated ? (
          <div className="empty-state">
            <span className="empty-state__icon">🔒</span>
            <p className="empty-state__title">
              {t("library.loggedOutTitle")}
            </p>
            <p className="empty-state__text">{t("library.loggedOutText")}</p>
            <Link className="btn btn--primary" to="/login">
              {t("auth.login")}
            </Link>
          </div>
        ) : isLoading ? (
          <div className="loading">
            <div className="spinner" />
            <p className="loading__text">{t("library.loading")}</p>
          </div>
        ) : errorMessage ? (
          <div className="error-message" role="alert">
            <span className="error-message__icon">⚠️</span>
            <p className="error-message__text">{errorMessage}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">📚</span>
            <p className="empty-state__title">{t("library.emptyTitle")}</p>
            <p className="empty-state__text">{t("library.emptyText")}</p>
            <Link className="btn btn--primary" to="/">
              {t("library.explore")}
            </Link>
          </div>
        ) : (
          <>
            <nav className="library-tabs" aria-label={t("library.welcomeTitle")}>
              {LIBRARY_TABS.map((tab) => {
                const count =
                  tab.key === "all"
                    ? items.length
                    : groupedItems[tab.key].length;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={`library-tab ${
                      activeTab === tab.key ? "library-tab--active" : ""
                    }`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {t(tab.labelKey)}
                    <span className="library-tab__count">{count}</span>
                  </button>
                );
              })}
            </nav>

            {visibleItems.length === 0 ? (
              <p className="library-section__empty">
                {t("library.sectionEmpty")}
              </p>
            ) : (
              <div className="manga-grid">
                {visibleItems.map((item) => {
                  const status = normalizeLibraryStatus(item.status);
                  const lastRead = formatLastRead(item.last_read_at, locale);

                  return (
                    <div
                      className="manga-card library-card"
                      key={item.manga_id}
                    >
                      <Link
                        className="library-card__link"
                        to={`/manga/${item.manga_id}`}
                      >
                        <div className="manga-card__cover">
                          <MangaCover
                            url={resolveCoverImageUrl(item.cover_url)}
                            alt={item.title}
                          />
                        </div>

                        <div className="manga-card__body">
                          <span className="status-badge">
                            {t(LIBRARY_STATUS_LABEL_KEY[status])}
                          </span>

                          <h3 className="manga-card__title">{item.title}</h3>

                          <div className="manga-card__meta">
                            <span>
                              {lastRead
                                ? t("library.readOn", { date: lastRead })
                                : t("library.notReadYet")}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
