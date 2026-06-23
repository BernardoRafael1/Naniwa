import { Link, useParams } from "react-router-dom";

export function MangaDetailsPage() {
  const { mangaId } = useParams();

  return (
    <main>
      <h1>MangaDetailsPage</h1>

      <p>ID do mangá recebido pela rota:</p>
      <code>{mangaId}</code>

      <br />
      <br />

      <Link to="/reader/example-chapter-id">
        Ir para ReaderPage
      </Link>
    </main>
  );
}