import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MangaCover } from "../../components/MangaCover";
import { useAuth } from "../../contexts/AuthContext";
import { LIBRARY_STATUS_LABEL_KEY } from "../../i18n/libraryStatus";
import { useTranslation } from "../../i18n/useTranslation";
import {
  getMangaProgress,
  upsertReadingProgress,
} from "../../services/progress/readingProgressApi";
import {
  getMangaChapters,
  getMangaDetails,
} from "../../services/mangadex/mangadexApi";
import {
  getCoverImageUrl,
  getLocalizedText,
  getMangaTitle,
  getRelationshipNames,
  resolveCoverImageUrl,
} from "../../services/mangadex/mangadexHelpers";
import type {
  MangaDexChapter,
  MangaDexManga,
} from "../../services/mangadex/mangadexTypes";
import {
  getLibraryItem,
  removeLibraryItem,
  updateLibraryItem,
  upsertLibraryItem,
} from "../../services/library/libraryApi";
import {
  LIBRARY_STATUSES,
  normalizeLibraryStatus,
  type LibraryItem,
  type LibraryStatus,
} from "../../services/library/libraryTypes";

export function MangaDetailsPage() {
  const { mangaId } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useTranslation();

  const [manga, setManga] = useState<MangaDexManga | null>(null);
  const [chapters, setChapters] = useState<MangaDexChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [libraryItem, setLibraryItem] = useState<LibraryItem | null>(null);
  const [isTogglingLibrary, setIsTogglingLibrary] = useState(false);
  const [libraryError, setLibraryError] = useState("");
  const [justAdded, setJustAdded] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [readChapterIds, setReadChapterIds] = useState<Set<string>>(new Set());
  // Página onde o usuário parou em cada capítulo ainda não concluído.
  const [resumeByChapter, setResumeByChapter] = useState<
    Record<string, number>
  >({});

  const justAddedTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mangaId) {
      setErrorMessage(t("details.idMissing"));
      setIsLoading(false);
      return;
    }

    const currentMangaId = mangaId;

    async function loadMangaDetails() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [mangaDetailsResponse, chaptersResponse] = await Promise.all([
          getMangaDetails(currentMangaId),
          getMangaChapters(currentMangaId, language),
        ]);

        setManga(mangaDetailsResponse.data);
        setChapters(chaptersResponse.data);
      } catch (error) {
        setErrorMessage(t("details.error"));
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }

    loadMangaDetails();
  }, [mangaId, language]);

  // Carrega o estado de biblioteca e os capítulos já lidos do usuário logado.
  useEffect(() => {
    if (!mangaId || !user) {
      setLibraryItem(null);
      setReadChapterIds(new Set());
      setResumeByChapter({});
      return;
    }

    let isActive = true;
    const currentUserId = user.id;
    const currentMangaId = mangaId;

    async function loadUserState() {
      try {
        const [item, progress] = await Promise.all([
          getLibraryItem(currentUserId, currentMangaId),
          getMangaProgress(currentUserId, currentMangaId),
        ]);

        if (!isActive) {
          return;
        }

        setLibraryItem(item);
        setReadChapterIds(
          new Set(
            progress
              .filter((entry) => entry.completed)
              .map((entry) => entry.chapter_id)
          )
        );

        // Guarda a página de retomada dos capítulos ainda não concluídos.
        const resume: Record<string, number> = {};
        for (const entry of progress) {
          if (!entry.completed && entry.page > 1) {
            resume[entry.chapter_id] = entry.page;
          }
        }
        setResumeByChapter(resume);
      } catch (error) {
        console.error(error);
      }
    }

    loadUserState();

    return () => {
      isActive = false;
    };
  }, [mangaId, user?.id]);

  // Limpa o timeout da confirmação ao desmontar.
  useEffect(() => {
    return () => {
      if (justAddedTimeoutRef.current !== null) {
        window.clearTimeout(justAddedTimeoutRef.current);
      }
    };
  }, []);

  // Marca todos os capítulos do mangá como lidos (usado ao concluir).
  async function markAllChaptersRead(userId: string, currentMangaId: string) {
    await Promise.allSettled(
      chapters.map((chapter) => {
        const total =
          chapter.attributes.pages > 0 ? chapter.attributes.pages : 1;

        return upsertReadingProgress(userId, {
          manga_id: currentMangaId,
          chapter_id: chapter.id,
          chapter_title: chapter.attributes.title ?? null,
          page: total,
          total_pages: total,
          completed: true,
        });
      })
    );
  }

  async function handleChooseStatus(status: LibraryStatus) {
    if (!user || !manga) {
      return;
    }

    setStatusMenuOpen(false);

    try {
      setIsTogglingLibrary(true);
      setLibraryError("");

      const wasInLibrary = Boolean(libraryItem);

      const item = wasInLibrary
        ? await updateLibraryItem(user.id, manga.id, { status })
        : await upsertLibraryItem(user.id, {
            manga_id: manga.id,
            title: getMangaTitle(manga),
            cover_url: getCoverImageUrl(manga, ""),
            status,
          });

      setLibraryItem(item);

      // Ao concluir, marca todos os capítulos como lidos automaticamente.
      if (status === "completed") {
        await markAllChaptersRead(user.id, manga.id);
        setReadChapterIds(new Set(chapters.map((chapter) => chapter.id)));
        setResumeByChapter({});
      }

      if (!wasInLibrary) {
        // Mostra a confirmação por alguns segundos e depois a esconde.
        setJustAdded(true);
        if (justAddedTimeoutRef.current !== null) {
          window.clearTimeout(justAddedTimeoutRef.current);
        }
        justAddedTimeoutRef.current = window.setTimeout(() => {
          setJustAdded(false);
        }, 3000);
      }
    } catch (error) {
      console.error(error);
      setLibraryError(t("library.saveError"));
    } finally {
      setIsTogglingLibrary(false);
    }
  }

  async function handleRemoveFromLibrary() {
    if (!user || !manga) {
      return;
    }

    setStatusMenuOpen(false);

    try {
      setIsTogglingLibrary(true);
      setLibraryError("");

      await removeLibraryItem(user.id, manga.id);

      setLibraryItem(null);
      setJustAdded(false);
    } catch (error) {
      console.error(error);
      setLibraryError(t("library.removeErrorDetails"));
    } finally {
      setIsTogglingLibrary(false);
    }
  }

  if (isLoading) {
    return (
      <div className="app-shell">
        <main className="details container">
          <div className="loading">
            <div className="spinner" />
            <p className="loading__text">{t("details.loading")}</p>
          </div>
        </main>
      </div>
    );
  }

  if (errorMessage || !manga) {
    return (
      <div className="app-shell">
        <main className="details container">
          <Link className="back-link details__back" to="/">
            <span className="back-link__icon">←</span> {t("common.back")}
          </Link>

          <div className="error-message" role="alert">
            <span className="error-message__icon">⚠️</span>
            <p className="error-message__text">
              {errorMessage || t("details.notFound")}
            </p>
          </div>
        </main>
      </div>
    );
  }

  const title = getMangaTitle(manga);
  const description = getLocalizedText(
    manga.attributes.description,
    t("details.noSynopsis")
  );
  const authors = getRelationshipNames(manga.relationships, "author");
  const artists = getRelationshipNames(manga.relationships, "artist");
  // URL canônica (para salvar na biblioteca) e a resolvida (para exibir).
  const rawCoverUrl = getCoverImageUrl(manga, "");
  const coverUrl = resolveCoverImageUrl(rawCoverUrl);

  const currentStatus: LibraryStatus = libraryItem
    ? normalizeLibraryStatus(libraryItem.status)
    : "planned";

  const tags = manga.attributes.tags.map((tag) =>
    getLocalizedText(tag.attributes.name)
  );

  return (
    <div className="app-shell">
      <main className="details container">
        <Link className="back-link details__back" to="/">
          <span className="back-link__icon">←</span> {t("common.backToSearch")}
        </Link>

        <header className="details-header">
          <div className="details-cover">
            <MangaCover url={coverUrl} alt={title} />
          </div>

          <div className="details-info">
            <h1 className="details-info__title">{title}</h1>

            {(authors || artists) && (
              <p className="details-info__authors">
                {authors && (
                  <>
                    <strong>{authors}</strong>
                  </>
                )}
                {artists && artists !== authors && (
                  <>
                    {" "}
                    · {t("details.artBy")} <strong>{artists}</strong>
                  </>
                )}
              </p>
            )}

            {tags.length > 0 && (
              <div className="details-tags">
                {tags.map((tag, index) => (
                  <span className="tag-chip" key={`${tag}-${index}`}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <p className="details-description">{description}</p>

            <div className="details-meta-grid">
              <div className="meta-block">
                <div className="meta-block__label">{t("details.year")}</div>
                <div className="meta-block__value">
                  {manga.attributes.year ?? "—"}
                </div>
              </div>

              <div className="meta-block">
                <div className="meta-block__label">{t("details.status")}</div>
                <div className="meta-block__value">
                  {manga.attributes.status}
                </div>
              </div>

              <div className="meta-block">
                <div className="meta-block__label">
                  {t("details.demographic")}
                </div>
                <div className="meta-block__value">
                  {manga.attributes.publicationDemographic ?? "—"}
                </div>
              </div>
            </div>

            {isAuthenticated && (
              <div className="details-library">
                <div className="library-picker">
                  <button
                    type="button"
                    className={`btn library-picker__toggle ${
                      libraryItem ? "btn--secondary" : "btn--primary"
                    }`}
                    onClick={() => setStatusMenuOpen((open) => !open)}
                    disabled={isTogglingLibrary}
                  >
                    {libraryItem
                      ? `${t("library.inLibrary")} · ${t(
                          LIBRARY_STATUS_LABEL_KEY[currentStatus]
                        )}`
                      : t("library.addToLibrary")}
                    <span className="library-picker__caret" aria-hidden="true">
                      ▾
                    </span>
                  </button>

                  {statusMenuOpen && (
                    <>
                      <button
                        type="button"
                        className="library-picker__backdrop"
                        aria-label=""
                        onClick={() => setStatusMenuOpen(false)}
                      />
                      <div className="library-picker__menu" role="menu">
                        {LIBRARY_STATUSES.map((status) => {
                          const isSelected =
                            Boolean(libraryItem) && currentStatus === status;

                          return (
                            <button
                              key={status}
                              type="button"
                              role="menuitem"
                              className={`library-picker__option ${
                                isSelected ? "is-selected" : ""
                              }`}
                              onClick={() => handleChooseStatus(status)}
                            >
                              <span>{t(LIBRARY_STATUS_LABEL_KEY[status])}</span>
                              {isSelected && (
                                <span className="library-picker__check">✓</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {libraryItem && (
                  <button
                    type="button"
                    className="btn btn--danger"
                    onClick={handleRemoveFromLibrary}
                    disabled={isTogglingLibrary}
                  >
                    {isTogglingLibrary
                      ? t("common.removing")
                      : t("library.removeFromLibrary")}
                  </button>
                )}

                {justAdded && (
                  <span className="details-actions__saved">
                    ✓ {t("library.added")}
                  </span>
                )}
              </div>
            )}

            {libraryError && (
              <p className="details-actions__error" role="alert">
                {libraryError}
              </p>
            )}
          </div>
        </header>

        <section className="details-section">
          <h2 className="details-section__title">
            {t("details.chapters")}
            <span className="count-pill">{chapters.length}</span>
          </h2>

          {chapters.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state__icon">📭</span>
              <p className="empty-state__title">
                {t("details.noChaptersTitle")}
              </p>
              <p className="empty-state__text">{t("details.noChaptersText")}</p>
            </div>
          ) : (
            <ul className="chapter-list">
              {chapters.map((chapter) => {
                const isRead = readChapterIds.has(chapter.id);
                const pageCount = chapter.attributes.pages;
                const resumePage = resumeByChapter[chapter.id];

                return (
                  <li
                    className={`chapter-item ${
                      isRead ? "chapter-item--read" : ""
                    }`}
                    key={chapter.id}
                  >
                    <div className="chapter-item__info">
                      <span className="chapter-item__number">
                        {t("details.chapter")}{" "}
                        <span>{chapter.attributes.chapter ?? "—"}</span>
                        {chapter.attributes.title
                          ? ` · ${chapter.attributes.title}`
                          : ""}
                      </span>
                      {!isRead && resumePage ? (
                        <span className="chapter-item__resume">
                          {t("home.continueOnPage", { page: resumePage })}
                        </span>
                      ) : (
                        <span className="chapter-item__meta">
                          {pageCount === 1
                            ? t("details.pageOne", { count: pageCount })
                            : t("details.pageOther", { count: pageCount })}
                        </span>
                      )}
                    </div>

                    <div className="chapter-item__action">
                      <Link
                        className={`btn btn--sm ${
                          isRead ? "btn--secondary" : "btn--primary"
                        }`}
                        to={`/manga/${manga.id}/reader/${chapter.id}`}
                      >
                        {isRead ? t("details.reread") : t("details.read")}
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
