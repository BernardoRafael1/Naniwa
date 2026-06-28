import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MangaCover } from "../../components/MangaCover";
import {
  getMangaChapters,
  getMangaDetails,
} from "../../services/mangadex/mangadexApi";
import {
  getCoverImageUrl,
  getLocalizedText,
  getMangaTitle,
  getRelationshipNames,
} from "../../services/mangadex/mangadexHelpers";
import type {
  MangaDexChapter,
  MangaDexManga,
} from "../../services/mangadex/mangadexTypes";

export function MangaDetailsPage() {
  const { mangaId } = useParams();

  const [manga, setManga] = useState<MangaDexManga | null>(null);
  const [chapters, setChapters] = useState<MangaDexChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!mangaId) {
      setErrorMessage("ID do mangá não encontrado.");
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
          getMangaChapters(currentMangaId),
        ]);

        setManga(mangaDetailsResponse.data);
        setChapters(chaptersResponse.data);
      } catch (error) {
        setErrorMessage("Não foi possível carregar os detalhes do mangá.");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }

    loadMangaDetails();
  }, [mangaId]);

  if (isLoading) {
    return (
      <div className="app-shell">
        <main className="details container">
          <div className="loading">
            <div className="spinner" />
            <p className="loading__text">Carregando detalhes do mangá...</p>
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
            <span className="back-link__icon">←</span> Voltar
          </Link>

          <div className="error-message" role="alert">
            <span className="error-message__icon">⚠️</span>
            <p className="error-message__text">
              {errorMessage || "Mangá não encontrado."}
            </p>
          </div>
        </main>
      </div>
    );
  }

  const title = getMangaTitle(manga);
  const description = getLocalizedText(
    manga.attributes.description,
    "Sem sinopse disponível."
  );
  const authors = getRelationshipNames(manga.relationships, "author");
  const artists = getRelationshipNames(manga.relationships, "artist");
  const coverUrl = getCoverImageUrl(manga, "");

  const tags = manga.attributes.tags.map((tag) =>
    getLocalizedText(tag.attributes.name)
  );

  return (
    <div className="app-shell">
      <main className="details container">
        <Link className="back-link details__back" to="/">
          <span className="back-link__icon">←</span> Voltar para a busca
        </Link>

        <header className="details-header">
          <div className="details-cover">
            <MangaCover url={coverUrl} alt={`Capa de ${title}`} />
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
                  <> · Arte por <strong>{artists}</strong></>
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
                <div className="meta-block__label">Ano</div>
                <div className="meta-block__value">
                  {manga.attributes.year ?? "—"}
                </div>
              </div>

              <div className="meta-block">
                <div className="meta-block__label">Status</div>
                <div className="meta-block__value">
                  {manga.attributes.status}
                </div>
              </div>

              <div className="meta-block">
                <div className="meta-block__label">Demografia</div>
                <div className="meta-block__value">
                  {manga.attributes.publicationDemographic ?? "—"}
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="details-section">
          <h2 className="details-section__title">
            Capítulos
            <span className="count-pill">{chapters.length}</span>
          </h2>

          {chapters.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state__icon">📭</span>
              <p className="empty-state__title">Nenhum capítulo disponível</p>
              <p className="empty-state__text">
                Não encontramos capítulos em português para este mangá.
              </p>
            </div>
          ) : (
            <ul className="chapter-list">
              {chapters.map((chapter) => (
                <li className="chapter-item" key={chapter.id}>
                  <div className="chapter-item__info">
                    <span className="chapter-item__number">
                      Capítulo <span>{chapter.attributes.chapter ?? "—"}</span>
                      {chapter.attributes.title
                        ? ` · ${chapter.attributes.title}`
                        : ""}
                    </span>
                    <span className="chapter-item__meta">
                      {chapter.attributes.pages} página
                      {chapter.attributes.pages === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="chapter-item__action">
                    <Link
                      className="btn btn--primary btn--sm"
                      to={`/manga/${manga.id}/reader/${chapter.id}`}
                    >
                      Ler
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
