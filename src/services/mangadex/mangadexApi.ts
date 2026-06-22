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

export async function searchMangaByTitle(title: string, limit = 20) {
  const params = new URLSearchParams();

  params.set("title", title);
  params.set("limit", String(limit));
  params.append("includes[]", "cover_art");

  return mangadexRequest(`/manga?${params.toString()}`);
}

export async function getMangaDetails(mangaId: string) {
  const params = new URLSearchParams();

  params.append("includes[]", "cover_art");
  params.append("includes[]", "author");
  params.append("includes[]", "artist");

  return mangadexRequest(`/manga/${mangaId}?${params.toString()}`);
}

export async function getMangaChapters(
  mangaId: string,
  language = "pt-br",
  limit = 100
) {
  const params = new URLSearchParams();

  params.append("translatedLanguage[]", language);
  params.set("limit", String(limit));
  params.set("order[chapter]", "asc");

  return mangadexRequest(`/manga/${mangaId}/feed?${params.toString()}`);
}

export async function getChapterPages(chapterId: string) {
  const chapterPages = await mangadexRequest<{
    baseUrl: string;
    chapter: {
      hash: string;
      data: string[];
    };
  }>(`/at-home/server/${chapterId}`);

  return chapterPages.chapter.data.map((pageFileName) => {
    return `${chapterPages.baseUrl}/data/${chapterPages.chapter.hash}/${pageFileName}`;
  });
}