// Proxy para a API da MangaDex, usado apenas na versão web (Vercel) para
// evitar erros de CORS. O app desktop (Tauri) continua chamando a MangaDex
// diretamente e não passa por aqui.
//
// Qualquer caminho após /api/mangadex é repassado para https://api.mangadex.org
// preservando os query params (title, limit, includes[], order[] etc).

const MANGADEX_ORIGIN = "https://api.mangadex.org";

export default async function handler(req, res) {
  // Apenas leitura pública é permitida.
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res
      .status(405)
      .json({ error: "Método não permitido. Use GET." });
  }

  try {
    // Reconstrói o caminho a partir do catch-all [...path].
    const { path = [] } = req.query;
    const segments = Array.isArray(path) ? path : [path];
    const targetPath = segments.join("/");

    // Preserva a query string original exatamente como recebida
    // (incluindo parâmetros repetidos como includes[] e order[chapter]).
    const queryIndex = req.url.indexOf("?");
    const search = queryIndex >= 0 ? req.url.slice(queryIndex) : "";

    const targetUrl = `${MANGADEX_ORIGIN}/${targetPath}${search}`;

    const upstreamResponse = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const body = await upstreamResponse.text();
    const contentType =
      upstreamResponse.headers.get("content-type") || "application/json";

    res.setHeader("Content-Type", contentType);
    // Cache curto na borda para respostas públicas, sem prejudicar navegação.
    res.setHeader(
      "Cache-Control",
      "public, max-age=0, s-maxage=30, stale-while-revalidate=60"
    );

    return res.status(upstreamResponse.status).send(body);
  } catch (error) {
    return res.status(502).json({
      error: "Falha ao acessar a MangaDex.",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
