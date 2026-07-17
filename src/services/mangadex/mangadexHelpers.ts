import type {
  LocalizedString,
  MangaDexManga,
  MangaDexRelationship,
} from "./mangadexTypes";

const MANGADEX_COVERS_BASE_URL = "https://uploads.mangadex.org/covers";

// Na Vercel (web), defina VITE_MANGADEX_COVER_PROXY_BASE_URL="/api/mangadex-cover"
// para carregar as capas via proxy e evitar o placeholder da MangaDex. Vazio
// (Tauri/local) mantém o carregamento direto do CDN.
const COVER_PROXY_BASE_URL =
  import.meta.env.VITE_MANGADEX_COVER_PROXY_BASE_URL || "";

/**
 * Resolve um texto localizado priorizando português, depois inglês e por fim
 * o romaji japonês. Cai para o primeiro valor disponível e, se não houver
 * nenhum, retorna o fallback informado.
 */
export function getLocalizedText(
  values: LocalizedString | undefined,
  fallback = "Não informado"
): string {
  if (!values) {
    return fallback;
  }

  return (
    values["pt-br"] ||
    values.en ||
    values["ja-ro"] ||
    Object.values(values)[0] ||
    fallback
  );
}

/** Retorna o melhor título disponível para um mangá. */
export function getMangaTitle(manga: MangaDexManga): string {
  return getLocalizedText(manga.attributes.title, "Título não disponível");
}

/** Junta os nomes das relações de um determinado tipo (autor, artista...). */
export function getRelationshipNames(
  relationships: MangaDexRelationship[],
  type: string
): string {
  return relationships
    .filter((relationship) => relationship.type === type)
    .map((relationship) => relationship.attributes?.name)
    .filter(Boolean)
    .join(", ");
}

/**
 * Monta a URL da capa de um mangá a partir do relacionamento `cover_art`
 * (incluído via `includes[]=cover_art`). Retorna `null` quando não há capa,
 * permitindo que a UI exiba um placeholder.
 *
 * Aceita um sufixo opcional de tamanho suportado pela MangaDex:
 * - "" (original)
 * - ".256.jpg" (thumbnail) ou ".512.jpg" (médio)
 */
export function getCoverImageUrl(
  manga: MangaDexManga,
  size: "" | ".256.jpg" | ".512.jpg" = ".512.jpg"
): string | null {
  const coverArt = manga.relationships.find(
    (relationship) => relationship.type === "cover_art"
  );

  const fileName = coverArt?.attributes?.fileName;

  if (!fileName) {
    return null;
  }

  return `${MANGADEX_COVERS_BASE_URL}/${manga.id}/${fileName}${size}`;
}

/**
 * Resolve a URL de capa para o ambiente atual. Na web (com o proxy
 * configurado), reescreve URLs de capa da MangaDex para o endpoint
 * `/api/mangadex-cover?mangaId=...&fileName=...`. Em outros casos (ou URLs de
 * outros domínios), retorna a URL original sem alterações.
 *
 * A URL canônica (absoluta) continua sendo a salva na biblioteca; a conversão
 * para o proxy acontece apenas na hora de renderizar.
 */
export function resolveCoverImageUrl(url: string | null): string | null {
  if (!url || !COVER_PROXY_BASE_URL) {
    return url;
  }

  const prefix = `${MANGADEX_COVERS_BASE_URL}/`;

  if (!url.startsWith(prefix)) {
    return url;
  }

  const rest = url.slice(prefix.length); // "{mangaId}/{fileName}"
  const slashIndex = rest.indexOf("/");

  if (slashIndex < 0) {
    return url;
  }

  const mangaId = rest.slice(0, slashIndex);
  const fileName = rest.slice(slashIndex + 1);

  return `${COVER_PROXY_BASE_URL}?mangaId=${encodeURIComponent(
    mangaId
  )}&fileName=${encodeURIComponent(fileName)}`;
}
