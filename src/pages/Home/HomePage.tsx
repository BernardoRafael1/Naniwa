import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { searchMangaByTitle } from "../../services/mangadex/mangadexApi";
import type { MangaDexManga } from "../../services/mangadex/mangadexTypes";

export function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [mangas, setMangas] = useState<MangaDexManga[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!searchTerm.trim()) {
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await searchMangaByTitle(searchTerm, 10);

      setMangas(response.data);
    } catch (error) {
      setErrorMessage("Não foi possível buscar mangás no momento.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main>
      <h1>Mangá Desk</h1>
      <p>Busque mangás usando a API do MangaDex.</p>

      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Digite o nome do mangá"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />

        <button type="submit">Buscar</button>
      </form>

      {isLoading && <p>Carregando...</p>}

      {errorMessage && <p>{errorMessage}</p>}

      {!isLoading && !errorMessage && mangas.length === 0 && (
        <p>Nenhum mangá carregado ainda.</p>
      )}

      <section>
        {mangas.map((manga) => {
          const title =
            manga.attributes.title.en ||
            manga.attributes.title["pt-br"] ||
            manga.attributes.title["ja-ro"] ||
            "Título não disponível";

          return (
            <article key={manga.id}>
              <h2>{title}</h2>

              <p>Ano: {manga.attributes.year ?? "Não informado"}</p>
              <p>Status: {manga.attributes.status}</p>

              <Link to={`/manga/${manga.id}`}>
                Ver detalhes
              </Link>
            </article>
          );
        })}
      </section>
    </main>
  );
}