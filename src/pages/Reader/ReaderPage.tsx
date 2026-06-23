import { useParams } from "react-router-dom";

export function ReaderPage() {
  const { chapterId } = useParams();

  return (
    <main>
      <h1>ReaderPage</h1>

      <p>ID do capítulo recebido pela rota:</p>
      <code>{chapterId}</code>
    </main>
  );
}