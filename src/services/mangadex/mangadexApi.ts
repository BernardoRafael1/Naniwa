import type {
  MangaSearchResponse,
  MangaDetailsResponse,
  MangaChaptersResponse,
  MangaDexAtHomeResponse,
} from "./mangadexTypes";

// Na Vercel (web), usar VITE_MANGADEX_API_BASE_URL="/api/mangadex" para
// passar pelo proxy e evitar CORS. No Tauri/local, sem a variável, chama a
// MangaDex diretamente.
const MANGADEX_BASE_URL =
  import.meta.env.VITE_MANGADEX_API_BASE_URL || "https://api.mangadex.org";

/**
 * Monta a URL final da requisição.
 *
 * - Base absoluta (ex.: https://api.mangadex.org): concatena o endpoint
 *   direto — comportamento usado no Tauri/local.
 * - Base relativa/proxy (ex.: /api/mangadex): converte o endpoint
 *   "/manga?title=x&limit=1" em "/api/mangadex?path=/manga&title=x&limit=1".
 */
function buildRequestUrl(endpoint: string): string {
  if (/^https?:\/\//i.test(MANGADEX_BASE_URL)) {
    return `${MANGADEX_BASE_URL}${endpoint}`;
  }

  const questionIndex = endpoint.indexOf("?");
  const pathPart =
    questionIndex >= 0 ? endpoint.slice(0, questionIndex) : endpoint;
  const queryPart = questionIndex >= 0 ? endpoint.slice(questionIndex + 1) : "";

  const search = `path=${encodeURIComponent(pathPart)}${
    queryPart ? `&${queryPart}` : ""
  }`;

  return `${MANGADEX_BASE_URL}?${search}`;
}

async function mangadexRequest<T>(endpoint: string): Promise<T> {
  const response = await fetch(buildRequestUrl(endpoint), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Erro na requisição MangaDex: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function searchMangaByTitle(
  title: string,
  limit = 20
): Promise<MangaSearchResponse> {
  const params = new URLSearchParams();

  params.set("title", title);
  params.set("limit", String(limit));
  params.append("includes[]", "cover_art");

  return mangadexRequest<MangaSearchResponse>(`/manga?${params.toString()}`);
}

/**
 * Lista mangás aplicando uma ordenação arbitrária. Usado pelas seções
 * curadas da HomePage (populares, lançamentos, etc). Sempre inclui a capa
 * e restringe o conteúdo a classificações seguras.
 */
export async function getMangaList(
  order: Record<string, string> = {},
  limit = 12
): Promise<MangaSearchResponse> {
  const params = new URLSearchParams();

  params.set("limit", String(limit));
  params.append("includes[]", "cover_art");
  params.append("contentRating[]", "safe");
  params.append("contentRating[]", "suggestive");
  params.set("hasAvailableChapters", "true");

  for (const [key, value] of Object.entries(order)) {
    params.set(`order[${key}]`, value);
  }

  return mangadexRequest<MangaSearchResponse>(`/manga?${params.toString()}`);
}

export async function getMangaDetails(
  mangaId: string
): Promise<MangaDetailsResponse> {
  const params = new URLSearchParams();

  params.append("includes[]", "cover_art");
  params.append("includes[]", "author");
  params.append("includes[]", "artist");

  return mangadexRequest<MangaDetailsResponse>(
    `/manga/${mangaId}?${params.toString()}`
  );
}

export async function getMangaChapters(
  mangaId: string,
  language = "pt-br",
  limit = 100
): Promise<MangaChaptersResponse> {
  const params = new URLSearchParams();

  params.append("translatedLanguage[]", language);
  params.set("limit", String(limit));
  params.set("order[chapter]", "asc");

  return mangadexRequest<MangaChaptersResponse>(
    `/manga/${mangaId}/feed?${params.toString()}`
  );
}

export async function getChapterPages(
  chapterId: string
): Promise<string[]> {
  const chapterPages = await mangadexRequest<MangaDexAtHomeResponse>(
    `/at-home/server/${chapterId}`
  );

  return chapterPages.chapter.data.map((pageFileName) => {
    return `${chapterPages.baseUrl}/data/${chapterPages.chapter.hash}/${pageFileName}`;
  });
}