// Proxy para a API da MangaDex, usado apenas na versão web (Vercel) para
// evitar erros de CORS. O app desktop (Tauri) continua chamando a MangaDex
// diretamente e não passa por aqui.
//
// Uso:
//   GET /api/mangadex?path=/manga&title=one%20piece&limit=1
// O parâmetro "path" define o endpoint da MangaDex; os demais query params
// são repassados (incluindo includes[], translatedLanguage[], order[chapter],
// limit, offset, title etc).

const MANGADEX_ORIGIN = "https://api.mangadex.org";

export default async function handler(req, res) {
  // Apenas leitura pública é permitida.
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res
      .status(405)
      .json({ message: "Método não permitido. Use GET." });
  }

  const { path, ...restQuery } = req.query;

  if (!path || typeof path !== "string") {
    return res
      .status(400)
      .json({ message: "O parâmetro 'path' é obrigatório." });
  }

  try {
    // Copia todos os query params (exceto "path"), preservando os repetidos.
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(restQuery)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          params.append(key, item);
        }
      } else if (value !== undefined) {
        params.append(key, value);
      }
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const queryString = params.toString();
    const targetUrl = `${MANGADEX_ORIGIN}${normalizedPath}${
      queryString ? `?${queryString}` : ""
    }`;

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
    // Cache curto na borda para respostas públicas.
    res.setHeader(
      "Cache-Control",
      "public, max-age=0, s-maxage=30, stale-while-revalidate=60"
    );

    return res.status(upstreamResponse.status).send(body);
  } catch (error) {
    return res.status(502).json({
      message: "Falha ao acessar a MangaDex.",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
