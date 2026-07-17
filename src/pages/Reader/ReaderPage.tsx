import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import {
  getChapterPages,
  getMangaChapters,
} from "../../services/mangadex/mangadexApi";
import { updateLibraryItem } from "../../services/library/libraryApi";
import {
  getChapterProgress,
  upsertReadingProgress,
} from "../../services/progress/readingProgressApi";

const UI_HIDE_DELAY = 2800;

export function ReaderPage() {
  const { mangaId, chapterId } = useParams();
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const navigate = useNavigate();

  const [pageUrls, setPageUrls] = useState<string[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [nextChapterId, setNextChapterId] = useState<string | null>(null);
  // Capítulo a que o conteúdo carregado (pageUrls + página atual) pertence.
  // Evita salvar dados de um capítulo com o id de outro durante a troca.
  const [loadedChapterId, setLoadedChapterId] = useState<string | null>(null);

  const hideTimeoutRef = useRef<number | null>(null);
  // Última página já persistida, para não salvar em excesso a cada render.
  const lastSavedPageRef = useRef<number | null>(null);

  // Destino do botão "Voltar": detalhes do mangá atual quando temos o id,
  // caindo para a HomePage como rede de segurança.
  const backTo = mangaId ? `/manga/${mangaId}` : "/";

  // Revela a interface e reinicia o cronômetro para escondê-la.
  const revealUi = useCallback(() => {
    setIsUiVisible(true);

    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current);
    }

    hideTimeoutRef.current = window.setTimeout(() => {
      setIsUiVisible(false);
    }, UI_HIDE_DELAY);
  }, []);

  useEffect(() => {
    if (!chapterId) {
      setErrorMessage(t("reader.chapterIdMissing"));
      setIsLoading(false);
      return;
    }

    const currentChapterId = chapterId;
    const activeUser = user;
    lastSavedPageRef.current = null;
    // Invalida o conteúdo anterior até o novo capítulo terminar de carregar.
    setLoadedChapterId(null);

    async function loadChapterPages() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const pages = await getChapterPages(currentChapterId);

        setPageUrls(pages);

        // Retoma a leitura na página salva, se houver progresso online.
        let startIndex = 0;

        if (activeUser) {
          try {
            const progress = await getChapterProgress(
              activeUser.id,
              currentChapterId
            );

            if (
              progress &&
              progress.page >= 1 &&
              progress.page <= pages.length
            ) {
              startIndex = progress.page - 1;
            }
          } catch (error) {
            console.error(error);
          }
        }

        setCurrentPageIndex(startIndex);
        // Marca que o conteúdo agora pertence a este capítulo.
        setLoadedChapterId(currentChapterId);
      } catch (error) {
        setErrorMessage(t("reader.error"));
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }

    loadChapterPages();
  }, [chapterId, user?.id]);

  // Salva o progresso online sempre que a página realmente muda.
  useEffect(() => {
    if (isLoading || !user || !chapterId || !mangaId) {
      return;
    }

    // Só salva quando o conteúdo carregado é realmente deste capítulo,
    // evitando gravar a última página do capítulo anterior no novo capítulo.
    if (loadedChapterId !== chapterId) {
      return;
    }

    if (pageUrls.length === 0) {
      return;
    }

    const page = currentPageIndex + 1;
    const totalPages = pageUrls.length;

    if (lastSavedPageRef.current === page) {
      return;
    }

    lastSavedPageRef.current = page;

    const activeUserId = user.id;
    const activeMangaId = mangaId;
    const activeChapterId = chapterId;
    const completed = page >= totalPages;

    async function saveProgress() {
      try {
        await upsertReadingProgress(activeUserId, {
          manga_id: activeMangaId,
          chapter_id: activeChapterId,
          page,
          total_pages: totalPages,
          completed,
        });

        // Atualiza o item da biblioteca, se o mangá estiver salvo.
        try {
          await updateLibraryItem(activeUserId, activeMangaId, {
            last_chapter_id: activeChapterId,
            last_page: page,
            total_pages: totalPages,
            last_read_at: new Date().toISOString(),
          });
        } catch (error) {
          // O mangá pode não estar na biblioteca — ignora silenciosamente.
          console.error(error);
        }
      } catch (error) {
        console.error(error);
      }
    }

    saveProgress();
  }, [
    currentPageIndex,
    pageUrls.length,
    chapterId,
    mangaId,
    user?.id,
    isLoading,
    loadedChapterId,
  ]);

  // Descobre o próximo capítulo (ordem crescente) para avanço automático.
  useEffect(() => {
    if (!mangaId || !chapterId) {
      setNextChapterId(null);
      return;
    }

    let isActive = true;
    const currentMangaId = mangaId;
    const currentChapterId = chapterId;

    async function loadNextChapter() {
      try {
        const response = await getMangaChapters(currentMangaId, language);

        if (!isActive) {
          return;
        }

        const chapters = response.data;
        const currentIndex = chapters.findIndex(
          (chapter) => chapter.id === currentChapterId
        );

        const next =
          currentIndex >= 0 && currentIndex < chapters.length - 1
            ? chapters[currentIndex + 1].id
            : null;

        setNextChapterId(next);
      } catch (error) {
        console.error(error);
        if (isActive) {
          setNextChapterId(null);
        }
      }
    }

    loadNextChapter();

    return () => {
      isActive = false;
    };
  }, [mangaId, chapterId, language]);

  const goToNextPage = useCallback(() => {
    // Passou da última página: avança automaticamente para o próximo capítulo.
    if (currentPageIndex >= pageUrls.length - 1) {
      if (nextChapterId && mangaId) {
        navigate(`/manga/${mangaId}/reader/${nextChapterId}`);
      }
      return;
    }

    setCurrentPageIndex((currentIndex) => currentIndex + 1);
  }, [currentPageIndex, pageUrls.length, nextChapterId, mangaId, navigate]);

  const goToPreviousPage = useCallback(() => {
    setCurrentPageIndex((currentIndex) => {
      if (currentIndex <= 0) {
        return currentIndex;
      }

      return currentIndex - 1;
    });
  }, []);

  // Mostra a UI ao mover o mouse e a esconde após inatividade.
  useEffect(() => {
    revealUi();

    window.addEventListener("mousemove", revealUi);

    return () => {
      window.removeEventListener("mousemove", revealUi);
      if (hideTimeoutRef.current !== null) {
        window.clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [revealUi]);

  // Navegação por teclado — não revela a interface (apenas o mouse revela).
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        goToNextPage();
      }

      if (event.key === "ArrowLeft") {
        goToPreviousPage();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [goToNextPage, goToPreviousPage]);

  function handleReaderClick(event: MouseEvent<HTMLDivElement>) {
    const readerArea = event.currentTarget;
    const readerAreaPosition = readerArea.getBoundingClientRect();

    const clickPositionX = event.clientX - readerAreaPosition.left;
    const clickedOnLeftSide = clickPositionX < readerAreaPosition.width / 2;

    if (clickedOnLeftSide) {
      goToPreviousPage();
      return;
    }

    goToNextPage();
  }

  if (isLoading) {
    return (
      <div className="reader-fullscreen-state">
        <div className="spinner spinner--light" />
        <p>{t("reader.loading")}</p>
      </div>
    );
  }

  if (errorMessage || pageUrls.length === 0) {
    return (
      <div className="reader-fullscreen-state">
        <span style={{ fontSize: "2rem" }}>⚠️</span>
        <p>{errorMessage || t("reader.noPages")}</p>
        <Link className="reader-back" to={backTo}>
          <span className="back-link__icon">←</span> {t("common.back")}
        </Link>
      </div>
    );
  }

  const currentPageUrl = pageUrls[currentPageIndex];
  const isFirstPage = currentPageIndex === 0;
  const isLastPage = currentPageIndex === pageUrls.length - 1;

  return (
    <div className={`reader ${isUiVisible ? "" : "reader--immersive"}`}>
      <header
        className={`reader-topbar ${
          isUiVisible ? "" : "reader-topbar--hidden"
        }`}
      >
        <Link className="reader-back" to={backTo}>
          <span className="back-link__icon">←</span> {t("common.back")}
        </Link>

        <span className="reader-counter">
          {t("reader.pageWord")} <strong>{currentPageIndex + 1}</strong>{" "}
          {t("reader.ofTotal", { total: pageUrls.length })}
        </span>
      </header>

      <div className="reader-stage" onClick={handleReaderClick}>
        <img
          key={currentPageIndex}
          className="reader-page-img"
          src={currentPageUrl}
          alt={t("reader.pageWord")}
        />
      </div>

      <footer
        className={`reader-controls ${
          isUiVisible ? "" : "reader-controls--hidden"
        }`}
      >
        {isLastPage && !nextChapterId && (
          <span className="reader-end-note">{t("reader.endOfChapter")}</span>
        )}

        <button
          className="reader-btn"
          type="button"
          onClick={goToPreviousPage}
          disabled={isFirstPage}
        >
          {t("reader.previous")}
        </button>

        <button
          className="reader-btn"
          type="button"
          onClick={goToNextPage}
          disabled={isLastPage && !nextChapterId}
        >
          {isLastPage && nextChapterId
            ? t("reader.nextChapter")
            : t("reader.next")}
        </button>
      </footer>
    </div>
  );
}
