import { useEffect, useState, type MouseEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { getChapterPages } from "../../services/mangadex/mangadexApi";

export function ReaderPage() {
  const { chapterId } = useParams();

  const [pageUrls, setPageUrls] = useState<string[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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

  function goToNextPage() {
    setCurrentPageIndex((currentIndex) => {
      if (currentIndex >= pageUrls.length - 1) {
        return currentIndex;
      }

      return currentIndex + 1;
    });
  }

  function goToPreviousPage() {
    setCurrentPageIndex((currentIndex) => {
      if (currentIndex <= 0) {
        return currentIndex;
      }

      return currentIndex - 1;
    });
  }

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

  }, [pageUrls.length]);
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
      <main>
        <p>Carregando capítulo...</p>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main>
        <p>{errorMessage}</p>
        <Link to="/">Voltar para HomePage</Link>
      </main>
    );
  }

  if (pageUrls.length === 0) {
    return (
      <main>
        <p>Nenhuma página encontrada para este capítulo.</p>
        <Link to="/">Voltar para HomePage</Link>
      </main>
    );
  }

  const currentPageUrl = pageUrls[currentPageIndex];
  const isFirstPage = currentPageIndex === 0;
  const isLastPage = currentPageIndex === pageUrls.length - 1;

  return (
    <main>
      <Link to="/">Voltar para HomePage</Link>

      <h1>Leitor</h1>

      <p>
        Página {currentPageIndex + 1} de {pageUrls.length}
      </p>

      <div>
        <button type="button" onClick={goToPreviousPage} disabled={isFirstPage}>
          Página anterior
        </button>

        <button type="button" onClick={goToNextPage} disabled={isLastPage}>
          Próxima página
        </button>
      </div>

      {isLastPage && (
        <p>Fim do capítulo. Navegação automática para o próximo capítulo será adicionada futuramente.</p>
      )}

    <div onClick={handleReaderClick}>
        <img src={currentPageUrl} alt={`Página ${currentPageIndex + 1}`} />
    </div>
    </main>
  );
}