import type { ReactNode } from "react";
import { MangaCard } from "./MangaCard";
import { useTranslation } from "../../i18n/useTranslation";
import type { MangaDexManga } from "../../services/mangadex/mangadexTypes";

export type SectionStatus = "loading" | "ready" | "error";

type MangaSectionProps = {
  title: string;
  subtitle?: string;
  status: SectionStatus;
  mangas: MangaDexManga[];
  /** "row" = carrossel horizontal (padrão); "grid" = grade responsiva. */
  layout?: "row" | "grid";
  /** Conteúdo alternativo quando a seção é um estado vazio puro. */
  emptyContent?: ReactNode;
};

export function MangaSection({
  title,
  subtitle,
  status,
  mangas,
  layout = "row",
  emptyContent,
}: MangaSectionProps) {
  const { t } = useTranslation();
  const containerClass = layout === "grid" ? "manga-grid" : "manga-row";

  return (
    <section className="manga-section">
      <div className="manga-section__header">
        <div>
          <h2 className="manga-section__title">{title}</h2>
          {subtitle && <p className="manga-section__subtitle">{subtitle}</p>}
        </div>
      </div>

      {status === "loading" && (
        <div className={containerClass}>
          {Array.from({ length: layout === "grid" ? 6 : 5 }).map((_, index) => (
            <div className="skeleton-card" key={index}>
              <div className="skeleton skeleton-card__cover" />
              <div className="skeleton-card__body">
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line skeleton-line--short" />
              </div>
            </div>
          ))}
        </div>
      )}

      {status === "error" && (
        <div className="section-message">
          <span>⚠️</span>
          <p>{t("section.loadError")}</p>
        </div>
      )}

      {status === "ready" && mangas.length === 0 && emptyContent}

      {status === "ready" && mangas.length > 0 && (
        <div className={containerClass}>
          {mangas.map((manga) => (
            <MangaCard manga={manga} key={manga.id} />
          ))}
        </div>
      )}
    </section>
  );
}
