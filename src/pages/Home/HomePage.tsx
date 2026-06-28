import { FormEvent, useEffect, useState } from "react";
import { Sidebar } from "../../components/layout/Sidebar";
import { MangaCard } from "../../components/manga/MangaCard";
import {
  MangaSection,
  type SectionStatus,
} from "../../components/manga/MangaSection";
import {
  getMangaList,
  searchMangaByTitle,
} from "../../services/mangadex/mangadexApi";
import type { MangaDexManga } from "../../services/mangadex/mangadexTypes";

type SectionKey = "destaque" | "lancamentos" | "populares" | "recomendados";

type SectionState = {
  status: SectionStatus;
  mangas: MangaDexManga[];
};

const SECTION_CONFIG: {
  key: SectionKey;
  title: string;
  subtitle: string;
  order: Record<string, string>;
}[] = [
  {
    key: "destaque",
    title: "Mangás em destaque",
    subtitle: "Os títulos mais seguidos do momento",
    order: { followedCount: "desc" },
  },
  {
    key: "lancamentos",
    title: "Últimos lançamentos",
    subtitle: "Capítulos publicados recentemente",
    order: { latestUploadedChapter: "desc" },
  },
  {
    key: "populares",
    title: "Populares",
    subtitle: "Bem avaliados pela comunidade",
    order: { rating: "desc" },
  },
  {
    key: "recomendados",
    title: "Recomendados",
    subtitle: "Novidades que chegaram ao catálogo",
    order: { createdAt: "desc" },
  },
];

const INITIAL_SECTIONS: Record<SectionKey, SectionState> = {
  destaque: { status: "loading", mangas: [] },
  lancamentos: { status: "loading", mangas: [] },
  populares: { status: "loading", mangas: [] },
  recomendados: { status: "loading", mangas: [] },
};

export function HomePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<MangaDexManga[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const [sections, setSections] =
    useState<Record<SectionKey, SectionState>>(INITIAL_SECTIONS);

  // Carrega as seções curadas em paralelo; cada uma falha de forma isolada.
  useEffect(() => {
    let cancelled = false;

    SECTION_CONFIG.forEach(async ({ key, order }) => {
      try {
        const response = await getMangaList(order, 12);
        if (cancelled) return;

        setSections((prev) => ({
          ...prev,
          [key]: { status: "ready", mangas: response.data },
        }));
      } catch (error) {
        console.error(`Falha ao carregar seção "${key}":`, error);
        if (cancelled) return;

        setSections((prev) => ({
          ...prev,
          [key]: { status: "error", mangas: [] },
        }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!searchTerm.trim()) {
      return;
    }

    try {
      setIsSearching(true);
      setSearchError("");
      setHasSearched(true);

      const response = await searchMangaByTitle(searchTerm, 12);
      setSearchResults(response.data);
    } catch (error) {
      setSearchError("Não foi possível buscar mangás no momento.");
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <header className="home-topbar">
        <button
          type="button"
          className="icon-button"
          aria-label="Abrir menu"
          onClick={() => setIsSidebarOpen(true)}
        >
          <span className="icon-button__bars" />
        </button>

        <form className="home-topbar__search" onSubmit={handleSearch}>
          <div className="search-field search-field--compact">
            <input
              className="input"
              type="text"
              placeholder="Buscar mangá..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button className="btn btn--primary" type="submit">
              Buscar
            </button>
          </div>
        </form>

        <div className="home-topbar__spacer" />
      </header>

      <main className="home container">
        <section className="home-welcome">
          <h1 className="home-welcome__title">
            Bem-vindo ao <span className="accent">Naniwa</span>
          </h1>
          <p className="home-welcome__subtitle">
            Explore milhares de mangás, descubra novos títulos e continue suas
            leituras — tudo em um só lugar.
          </p>
        </section>

        {/* Resultados da busca aparecem apenas após pesquisar. */}
        {hasSearched && (
          <section className="manga-section">
            <div className="manga-section__header">
              <h2 className="manga-section__title">Resultados da busca</h2>
            </div>

            {isSearching ? (
              <div className="manga-grid">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div className="skeleton-card" key={index}>
                    <div className="skeleton skeleton-card__cover" />
                    <div className="skeleton-card__body">
                      <div className="skeleton skeleton-line" />
                      <div className="skeleton skeleton-line skeleton-line--short" />
                    </div>
                  </div>
                ))}
              </div>
            ) : searchError ? (
              <div className="error-message" role="alert">
                <span className="error-message__icon">⚠️</span>
                <p className="error-message__text">{searchError}</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon">🔍</span>
                <p className="empty-state__title">Nenhum resultado encontrado</p>
                <p className="empty-state__text">
                  Tente buscar por outro título ou verifique a ortografia.
                </p>
              </div>
            ) : (
              <div className="manga-grid">
                {searchResults.map((manga) => (
                  <MangaCard manga={manga} key={manga.id} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Continuar lendo — estado vazio (sem progresso local ainda). */}
        <section className="manga-section">
          <div className="manga-section__header">
            <h2 className="manga-section__title">Continuar lendo</h2>
          </div>
          <div className="continue-empty">
            <span className="continue-empty__icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="28"
                height="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 4h10a1 1 0 0 1 1 1v15H7a1 1 0 0 1-1-1V4Z" />
                <path d="M6 4a2 2 0 0 0-2 2v12" />
                <path d="M10 8h4" />
              </svg>
            </span>
            <div>
              <p className="continue-empty__title">
                Você ainda não começou nenhuma leitura.
              </p>
              <p className="continue-empty__text">
                Quando abrir um capítulo, ele aparecerá aqui para retomar
                rapidamente.
              </p>
            </div>
          </div>
        </section>

        {SECTION_CONFIG.map(({ key, title, subtitle }) => (
          <MangaSection
            key={key}
            title={title}
            subtitle={subtitle}
            status={sections[key].status}
            mangas={sections[key].mangas}
            layout="row"
          />
        ))}
      </main>
    </div>
  );
}
