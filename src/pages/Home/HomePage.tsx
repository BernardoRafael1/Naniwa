import { Link } from "react-router-dom";

const steelBallRunId = "b30dfee3-9d1d-4e8d-bfbe-8fcabc3c96f6";

export function HomePage() {
  return (
    <main>
      <h1>HomePage</h1>
      <p>Tela inicial da V1.</p>

      <Link to={`/manga/${steelBallRunId}`}>
        Ir para detalhes de Steel Ball Run
      </Link>
    </main>
  );
}