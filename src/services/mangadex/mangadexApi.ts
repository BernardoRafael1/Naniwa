import type {
  MangaSearchResponse,
  MangaDetailsResponse,
  MangaChaptersResponse,
  MangaDexAtHomeResponse,
} from "./mangadexTypes";

const MANGADEX_BASE_URL = "https://api.mangadex.org";

async function mangadexRequest<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${MANGADEX_BASE_URL}${endpoint}`, {
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