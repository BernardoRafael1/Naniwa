import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getMangaChapters,
  getMangaDetails,
} from "../../services/mangadex/mangadexApi";
import type {
  MangaDexChapter,
  MangaDexManga,
  MangaDexRelationship,
} from "../../services/mangadex/mangadexTypes";

function getLocalizedText(
  values: Record<string, string> | undefined,
  fallback = "Não informado"
) {
  if (!values) {
    return fallback;
  }

  return (
    values["pt-br"] ||
    values.en ||
    values["ja-ro"] ||
    Object.values(values)[0] ||
    fallback
  );
}

function getRelationshipNames(
  relationships: MangaDexRelationship[],
  type: string
) {
  return relationships
    .filter((relationship) => relationship.type === type)
    .map((relationship) => relationship.attributes?.name)
    .filter(Boolean)
    .join(", ");
}

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
      <main>
        <p>Carregando detalhes do mangá...</p>
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

  if (!manga) {
    return (
      <main>
        <p>Mangá não encontrado.</p>
        <Link to="/">Voltar para HomePage</Link>
      </main>
    );
  }

  const title = getLocalizedText(manga.attributes.title);
  const description = getLocalizedText(manga.attributes.description);
  const authors = getRelationshipNames(manga.relationships, "author");
  const artists = getRelationshipNames(manga.relationships, "artist");

  const tags = manga.attributes.tags
    .map((tag) => getLocalizedText(tag.attributes.name))
    .join(", ");

  return (
    <main>
      <Link to="/">Voltar para HomePage</Link>

      <h1>{title}</h1>

      <p>{description}</p>

      <section>
        <h2>Informações</h2>

        <p>Ano: {manga.attributes.year ?? "Não informado"}</p>
        <p>Status: {manga.attributes.status}</p>
        <p>Demografia: {manga.attributes.publicationDemographic ?? "Não informado"}</p>
        <p>Autor: {authors || "Não informado"}</p>
        <p>Ilustrador: {artists || "Não informado"}</p>
        <p>Gêneros/Tags: {tags || "Não informado"}</p>
      </section>

      <section>
        <h2>Capítulos</h2>

        {chapters.length === 0 && (
          <p>Nenhum capítulo em português encontrado para este mangá.</p>
        )}

        {chapters.map((chapter) => (
          <article key={chapter.id}>
            <p>
              Capítulo {chapter.attributes.chapter ?? "sem número"} —{" "}
              {chapter.attributes.title || "Sem título"}
            </p>

            <p>Páginas: {chapter.attributes.pages}</p>

            <Link to={`/reader/${chapter.id}`}>
              Abrir capítulo
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}