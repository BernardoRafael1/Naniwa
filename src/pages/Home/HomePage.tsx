import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sidebar } from "../../components/layout/Sidebar";
import { MangaCover } from "../../components/MangaCover";
import { MangaCard } from "../../components/manga/MangaCard";
import {
  MangaSection,
  type SectionStatus,
} from "../../components/manga/MangaSection";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import type { TranslationKey } from "../../i18n/translations";
import {
  getMangaChapters,
  getMangaDetails,
  getMangaList,
  searchMangaByTitle,
} from "../../services/mangadex/mangadexApi";
import {
  getCoverImageUrl,
  getMangaTitle,
  resolveCoverImageUrl,
} from "../../services/mangadex/mangadexHelpers";
import type { MangaDexManga } from "../../services/mangadex/mangadexTypes";
import { getMyLibraryItems } from "../../services/library/libraryApi";
import { normalizeLibraryStatus } from "../../services/library/libraryTypes";
import {
  getMangaProgress,
  getRecentReadingProgress,
  removeMangaProgress,
} from "../../services/progress/readingProgressApi";

type ContinueItem = {
  mangaId: string;
  chapterId: string;
  chapter: string | null;
  page: number;
  title: string;
  coverUrl: string | null;
};

type SectionKey = "destaque" | "lancamentos" | "populares" | "recomendados";

type SectionState = {
  status: SectionStatus;
  mangas: MangaDexManga[];
};

const SECTION_CONFIG: {
  key: SectionKey;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  order: Record<string, string>;
}[] = [
  {
    key: "destaque",
    titleKey: "section.featured.title",
    subtitleKey: "section.featured.subtitle",
    order: { followedCount: "desc" },
  },
  {
    key: "lancamentos",
    titleKey: "section.latest.title",
    subtitleKey: "section.latest.subtitle",
    order: { latestUploadedChapter: "desc" },
  },
  {
    key: "populares",
    titleKey: "section.popular.title",
    subtitleKey: "section.popular.subtitle",
    order: { rating: "desc" },
  },
  {
    key: "recomendados",
    titleKey: "section.recommended.title",
    subtitleKey: "section.recommended.subtitle",
    order: { createdAt: "desc" },
  },
];

const INITIAL_SECTIONS: Record<SectionKey, SectionState> = {
  destaque: { status: "loading", mangas: [] },
  lancamentos: { status: "loading", mangas: [] },
  populares: { status: "loading", mangas: [] },
  recomendados: { status: "loading", mangas: [] },
};

export function HomePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { t, language } = useTranslation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [continueItems, setContinueItems] = useState<ContinueItem[]>([]);
  const [isContinueLoading, setIsContinueLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<MangaDexManga[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const [sections, setSections] =
    useState<Record<SectionKey, SectionState>>(INITIAL_SECTIONS);

  // Carrega as seções curadas em paralelo; cada uma falha de forma isolada.
  useEffect(() => {
    let cancelled = false;

    SECTION_CONFIG.forEach(async ({ key, order }) => {
      try {
        const response = await getMangaList(order, 12);
        if (cancelled) return;

        setSections((prev) => ({
          ...prev,
          [key]: { status: "ready", mangas: response.data },
        }));
      } catch (error) {
        console.error(`Falha ao carregar seção "${key}":`, error);
        if (cancelled) return;

        setSections((prev) => ({
          ...prev,
          [key]: { status: "error", mangas: [] },
        }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Carrega "Continuar lendo" a partir do progresso online do usuário.
  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      setContinueItems([]);
      setIsContinueLoading(false);
      return;
    }

    let cancelled = false;
    const userId = user.id;

    async function loadContinueReading() {
      try {
        setIsContinueLoading(true);

        const [progress, libraryItems] = await Promise.all([
          getRecentReadingProgress(userId, 20),
          getMyLibraryItems(userId),
        ]);

        // Mangás concluídos na biblioteca não aparecem em "continuar lendo".
        const completedMangaIds = new Set(
          libraryItems
            .filter(
              (item) => normalizeLibraryStatus(item.status) === "completed"
            )
            .map((item) => item.manga_id)
        );

        // Mantém apenas o capítulo mais recente por mangá, sem os concluídos.
        const seen = new Set<string>();
        const recent = progress
          .filter((entry) => {
            if (seen.has(entry.manga_id)) {
              return false;
            }
            seen.add(entry.manga_id);
            return true;
          })
          .filter((entry) => !completedMangaIds.has(entry.manga_id))
          .slice(0, 6);

        const results = await Promise.allSettled(
          recent.map(async (entry) => {
            const [details, chaptersResponse, mangaProgress] =
              await Promise.all([
                getMangaDetails(entry.manga_id),
                getMangaChapters(entry.manga_id, language),
                getMangaProgress(userId, entry.manga_id),
              ]);

            // Se todos os capítulos já foram lidos, não é "continuar lendo".
            const chapterIds = chaptersResponse.data.map(
              (chapter) => chapter.id
            );
            const readChapterIds = new Set(
              mangaProgress
                .filter((item) => item.completed)
                .map((item) => item.chapter_id)
            );
            const allChaptersRead =
              chapterIds.length > 0 &&
              chapterIds.every((id) => readChapterIds.has(id));

            if (allChaptersRead) {
              return null;
            }

            const currentChapter = chaptersResponse.data.find(
              (chapter) => chapter.id === entry.chapter_id
            );

            return {
              mangaId: entry.manga_id,
              chapterId: entry.chapter_id,
              chapter: currentChapter?.attributes.chapter ?? null,
              page: entry.page,
              title: getMangaTitle(details.data),
              coverUrl: resolveCoverImageUrl(getCoverImageUrl(details.data)),
            } satisfies ContinueItem;
          })
        );

        if (cancelled) {
          return;
        }

        const items = results
          .filter(
            (
              result
            ): result is PromiseFulfilledResult<ContinueItem | null> =>
              result.status === "fulfilled"
          )
          .map((result) => result.value)
          .filter((value): value is ContinueItem => value !== null);

        setContinueItems(items);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setContinueItems([]);
        }
      } finally {
        if (!cancelled) {
          setIsContinueLoading(false);
        }
      }
    }

    loadContinueReading();

    return () => {
      cancelled = true;
    };
  }, [user?.id, isAuthLoading, language]);

  async function handleDismissContinue(mangaId: string) {
    if (!user) {
      return;
    }

    const previousItems = continueItems;
    setContinueItems((prev) => prev.filter((it) => it.mangaId !== mangaId));

    try {
      await removeMangaProgress(user.id, mangaId);
    } catch (error) {
      console.error(error);
      // Restaura a lista caso a exclusão falhe.
      setContinueItems(previousItems);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!searchTerm.trim()) {
      return;
    }

    try {
      setIsSearching(true);
      setSearchError("");
      setHasSearched(true);

      const response = await searchMangaByTitle(searchTerm, 12);
      setSearchResults(response.data);
    } catch (error) {
      setSearchError(t("home.searchError"));
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  }

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

        <form className="home-topbar__search" onSubmit={handleSearch}>
          <div className="search-field search-field--compact">
            <input
              className="input"
              type="text"
              placeholder={t("home.searchPlaceholder")}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button className="btn btn--primary" type="submit">
              {t("home.searchButton")}
            </button>
          </div>
        </form>

        <div className="home-topbar__spacer" />
      </header>

      <main className="home container">
        <section className="home-welcome">
          <h1 className="home-welcome__title">
            {t("home.welcomePrefix")} <span className="accent">Naniwa</span>
          </h1>
          <p className="home-welcome__subtitle">{t("home.welcomeSubtitle")}</p>
        </section>

        {/* Resultados da busca aparecem apenas após pesquisar. */}
        {hasSearched && (
          <section className="manga-section">
            <div className="manga-section__header">
              <h2 className="manga-section__title">
                {t("home.searchResults")}
              </h2>
            </div>

            {isSearching ? (
              <div className="manga-grid">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div className="skeleton-card" key={index}>
                    <div className="skeleton skeleton-card__cover" />
                    <div className="skeleton-card__body">
                      <div className="skeleton skeleton-line" />
                      <div className="skeleton skeleton-line skeleton-line--short" />
                    </div>
                  </div>
                ))}
              </div>
            ) : searchError ? (
              <div className="error-message" role="alert">
                <span className="error-message__icon">⚠️</span>
                <p className="error-message__text">{searchError}</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon">🔍</span>
                <p className="empty-state__title">
                  {t("home.noResultsTitle")}
                </p>
                <p className="empty-state__text">{t("home.noResultsText")}</p>
              </div>
            ) : (
              <div className="manga-grid">
                {searchResults.map((manga) => (
                  <MangaCard manga={manga} key={manga.id} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Continuar lendo — retoma exatamente onde o usuário parou. */}
        {(!user || isContinueLoading || continueItems.length > 0) && (
          <section className="manga-section">
            <div className="manga-section__header">
              <h2 className="manga-section__title">
                {t("home.continueReading")}
              </h2>
            </div>

            {!user ? (
              <div className="continue-empty">
                <span className="continue-empty__icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    width="28"
                    height="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 4h10a1 1 0 0 1 1 1v15H7a1 1 0 0 1-1-1V4Z" />
                    <path d="M6 4a2 2 0 0 0-2 2v12" />
                    <path d="M10 8h4" />
                  </svg>
                </span>
                <div>
                  <p className="continue-empty__title">
                    {t("home.continueLoggedOutTitle")}
                  </p>
                  <p className="continue-empty__text">
                    {t("home.continueLoggedOutText")}
                  </p>
                </div>
              </div>
            ) : isContinueLoading ? (
              <div className="manga-row">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div className="skeleton-card" key={index}>
                    <div className="skeleton skeleton-card__cover" />
                    <div className="skeleton-card__body">
                      <div className="skeleton skeleton-line" />
                      <div className="skeleton skeleton-line skeleton-line--short" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="manga-row">
                {continueItems.map((item) => (
                  <div className="manga-card continue-card" key={item.mangaId}>
                    <Link
                      className="library-card__link"
                      to={`/manga/${item.mangaId}/reader/${item.chapterId}`}
                    >
                      <div className="manga-card__cover">
                        <MangaCover url={item.coverUrl} alt={item.title} />
                      </div>

                      <div className="manga-card__body">
                        <h3 className="manga-card__title">{item.title}</h3>

                        <div className="manga-card__meta">
                          <span>
                            {item.chapter
                              ? t("home.continueChapterPage", {
                                  chapter: item.chapter,
                                  page: item.page,
                                })
                              : t("home.continueOnPage", { page: item.page })}
                          </span>
                        </div>
                      </div>
                    </Link>

                    <button
                      type="button"
                      className="continue-card__dismiss"
                      onClick={() => handleDismissContinue(item.mangaId)}
                    >
                      {t("home.dontContinue")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {SECTION_CONFIG.map(({ key, titleKey, subtitleKey }) => (
          <MangaSection
            key={key}
            title={t(titleKey)}
            subtitle={t(subtitleKey)}
            status={sections[key].status}
            mangas={sections[key].mangas}
            layout="row"
          />
        ))}
      </main>
    </div>
  );
}
