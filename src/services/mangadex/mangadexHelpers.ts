import type {
  LocalizedString,
  MangaDexManga,
  MangaDexRelationship,
} from "./mangadexTypes";

const MANGADEX_COVERS_BASE_URL = "https://uploads.mangadex.org/covers";

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
