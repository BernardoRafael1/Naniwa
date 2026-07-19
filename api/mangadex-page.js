// Proxy das imagens de páginas dos capítulos, usado apenas na versão web
// (Vercel). Sem ele, a MangaDex bloqueia/quebra as imagens carregadas
// diretamente em contexto web externo. O app desktop (Tauri) não usa este
// endpoint e continua carregando as imagens direto da MangaDex.
//
// Uso:
//   GET /api/mangadex-page?url=https%3A%2F%2Fuploads.mangadex.org%2Fdata%2Fhash%2Fpage.jpg
//
// Não é um proxy aberto: só aceita URLs https de hosts oficiais da MangaDex
// cujo caminho comece com /data/ (ou /data-saver/).

// uploads.mangadex.org é o host principal; o endpoint /at-home/server também
// pode devolver nós oficiais da rede MangaDex@Home (*.mangadex.network).
const ALLOWED_HOSTNAME = "uploads.mangadex.org";
const ALLOWED_HOST_SUFFIX = ".mangadex.network";
const ALLOWED_PATH_PREFIXES = ["/data/", "/data-saver/"];

function isAllowedPageUrl(parsedUrl) {
  if (parsedUrl.protocol !== "https:") {
    return false;
  }

  const isAllowedHost =
    parsedUrl.hostname === ALLOWED_HOSTNAME ||
    parsedUrl.hostname.endsWith(ALLOWED_HOST_SUFFIX);

  if (!isAllowedHost) {
    return false;
  }

  return ALLOWED_PATH_PREFIXES.some((prefix) =>
    parsedUrl.pathname.startsWith(prefix)
  );
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res
      .status(405)
      .json({ message: "Método não permitido. Use GET." });
  }

  const { url } = req.query;

  if (!url || typeof url !== "string") {
    return res
      .status(400)
      .json({ message: "O parâmetro 'url' é obrigatório." });
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ message: "URL inválida." });
  }

  if (!isAllowedPageUrl(parsedUrl)) {
    return res
      .status(400)
      .json({ message: "URL não permitida para este proxy." });
  }

  try {
    const upstreamResponse = await fetch(parsedUrl.toString(), {
      method: "GET",
      headers: {
        Accept:
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent": "Naniwa/1.0",
        Referer: "https://mangadex.org/",
      },
    });

    if (!upstreamResponse.ok) {
      return res.status(upstreamResponse.status).json({
        message: `Falha ao carregar a página (${upstreamResponse.status}).`,
      });
    }

    const arrayBuffer = await upstreamResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType =
      upstreamResponse.headers.get("content-type") || "image/jpeg";

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=86400, stale-while-revalidate=604800"
    );

    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(500).json({
      message: "Falha ao acessar a imagem da página na MangaDex.",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
