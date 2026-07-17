// Proxy de capas da MangaDex, usado apenas na versão web (Vercel). A MangaDex
// substitui as imagens por um placeholder quando carregadas diretamente de
// uploads.mangadex.org em contexto web externo; buscando pelo servidor com os
// headers corretos, a imagem real é retornada.
//
// Uso:
//   GET /api/mangadex-cover?mangaId={mangaId}&fileName={fileName}
//
// Aceita apenas mangaId e fileName validados — não é um proxy aberto.

const UPLOADS_ORIGIN = "https://uploads.mangadex.org";

// mangaId é um UUID; fileName é o nome do arquivo (sem barras nem "..").
const MANGA_ID_PATTERN = /^[a-f0-9-]{8,64}$/i;
const FILE_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res
      .status(405)
      .json({ message: "Método não permitido. Use GET." });
  }

  const { mangaId, fileName } = req.query;

  const isValidMangaId =
    typeof mangaId === "string" && MANGA_ID_PATTERN.test(mangaId);
  const isValidFileName =
    typeof fileName === "string" &&
    FILE_NAME_PATTERN.test(fileName) &&
    !fileName.includes("..");

  if (!isValidMangaId || !isValidFileName) {
    return res
      .status(400)
      .json({ message: "Parâmetros 'mangaId' e 'fileName' inválidos." });
  }

  try {
    const targetUrl = `${UPLOADS_ORIGIN}/covers/${mangaId}/${fileName}`;

    const upstreamResponse = await fetch(targetUrl, {
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
        message: `Falha ao carregar a capa (${upstreamResponse.status}).`,
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
    return res.status(502).json({
      message: "Falha ao acessar a capa da MangaDex.",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
