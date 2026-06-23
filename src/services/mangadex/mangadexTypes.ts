export type LocalizedString = Record<string, string>;

export type MangaDexRelationship = {
  id: string;
  type: string;
  attributes?: {
    name?: string;
    fileName?: string;
    [key: string]: unknown;
  };
};

export type MangaDexTag = {
  id: string;
  type: "tag";
  attributes: {
    name: LocalizedString;
    description: LocalizedString;
    group: string;
    version: number;
  };
};

export type MangaDexManga = {
  id: string;
  type: "manga";
  attributes: {
    title: LocalizedString;
    altTitles: LocalizedString[];
    description: LocalizedString;
    originalLanguage: string;
    lastVolume: string | null;
    lastChapter: string | null;
    publicationDemographic: string | null;
    status: string;
    year: number | null;
    contentRating: string;
    tags: MangaDexTag[];
    createdAt: string;
    updatedAt: string;
  };
  relationships: MangaDexRelationship[];
};

export type MangaDexChapter = {
  id: string;
  type: "chapter";
  attributes: {
    volume: string | null;
    chapter: string | null;
    title: string | null;
    translatedLanguage: string;
    pages: number;
    publishAt: string;
    readableAt: string;
    createdAt: string;
    updatedAt: string;
  };
  relationships: MangaDexRelationship[];
};

export type MangaDexListResponse<T> = {
  result: string;
  response: string;
  data: T[];
  limit: number;
  offset: number;
  total: number;
};

export type MangaDexEntityResponse<T> = {
  result: string;
  response: string;
  data: T;
};

export type MangaDexAtHomeResponse = {
  result: string;
  baseUrl: string;
  chapter: {
    hash: string;
    data: string[];
    dataSaver: string[];
  };
};

export type MangaSearchResponse = MangaDexListResponse<MangaDexManga>;

export type MangaDetailsResponse = MangaDexEntityResponse<MangaDexManga>;

export type MangaChaptersResponse = MangaDexListResponse<MangaDexChapter>;