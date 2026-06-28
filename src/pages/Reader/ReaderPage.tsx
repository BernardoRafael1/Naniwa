import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { Link, useParams } from "react-router-dom";
import { getChapterPages } from "../../services/mangadex/mangadexApi";

const UI_HIDE_DELAY = 2800;

export function ReaderPage() {
  const { mangaId, chapterId } = useParams();

  const [pageUrls, setPageUrls] = useState<string[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUiVisible, setIsUiVisible] = useState(true);

  const hideTimeoutRef = useRef<number | null>(null);

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
      setErrorMessage("ID do capítulo não encontrado.");
      setIsLoading(false);
      return;
    }

    const currentChapterId = chapterId;

    async function loadChapterPages() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const pages = await getChapterPages(currentChapterId);

        setPageUrls(pages);
        setCurrentPageIndex(0);
      } catch (error) {
        setErrorMessage("Não foi possível carregar as páginas do capítulo.");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }

    loadChapterPages();
  }, [chapterId]);

  const goToNextPage = useCallback(() => {
    setCurrentPageIndex((currentIndex) => {
      if (currentIndex >= pageUrls.length - 1) {
        return currentIndex;
      }

      return currentIndex + 1;
    });
  }, [pageUrls.length]);

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
        <p>Carregando capítulo...</p>
      </div>
    );
  }

  if (errorMessage || pageUrls.length === 0) {
    return (
      <div className="reader-fullscreen-state">
        <span style={{ fontSize: "2rem" }}>⚠️</span>
        <p>{errorMessage || "Nenhuma página encontrada para este capítulo."}</p>
        <Link className="reader-back" to={backTo}>
          <span className="back-link__icon">←</span> Voltar
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
          <span className="back-link__icon">←</span> Voltar
        </Link>

        <span className="reader-counter">
          Página <strong>{currentPageIndex + 1}</strong> de {pageUrls.length}
        </span>
      </header>

      <div className="reader-stage" onClick={handleReaderClick}>
        <img
          key={currentPageIndex}
          className="reader-page-img"
          src={currentPageUrl}
          alt={`Página ${currentPageIndex + 1}`}
        />
      </div>

      <footer
        className={`reader-controls ${
          isUiVisible ? "" : "reader-controls--hidden"
        }`}
      >
        {isLastPage && (
          <span className="reader-end-note">Fim do capítulo</span>
        )}

        <button
          className="reader-btn"
          type="button"
          onClick={goToPreviousPage}
          disabled={isFirstPage}
        >
          ← Anterior
        </button>

        <button
          className="reader-btn"
          type="button"
          onClick={goToNextPage}
          disabled={isLastPage}
        >
          Próxima →
        </button>
      </footer>
    </div>
  );
}
