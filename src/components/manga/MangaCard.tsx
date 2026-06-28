import { Link } from "react-router-dom";
import { MangaCover } from "../MangaCover";
import {
  getCoverImageUrl,
  getMangaTitle,
} from "../../services/mangadex/mangadexHelpers";
import type { MangaDexManga } from "../../services/mangadex/mangadexTypes";

function statusBadgeClass(status: string) {
  if (status === "completed") {
    return "status-badge status-badge--completed";
  }

  if (status === "ongoing") {
    return "status-badge status-badge--ongoing";
  }

  return "status-badge";
}

type MangaCardProps = {
  manga: MangaDexManga;
};

export function MangaCard({ manga }: MangaCardProps) {
  const title = getMangaTitle(manga);
  const coverUrl = getCoverImageUrl(manga);
  const status = manga.attributes.status;

  return (
    <Link className="manga-card" to={`/manga/${manga.id}`}>
      <div className="manga-card__cover">
        <MangaCover url={coverUrl} alt={`Capa de ${title}`} />
      </div>

      <div className="manga-card__body">
        <span className={statusBadgeClass(status)}>{status}</span>

        <h3 className="manga-card__title">{title}</h3>

        <div className="manga-card__meta">
          <span>{manga.attributes.year ?? "Ano —"}</span>
        </div>
      </div>
    </Link>
  );
}
