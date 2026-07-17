import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sidebar } from "../../components/layout/Sidebar";
import { MangaCover } from "../../components/MangaCover";
import { useAuth } from "../../contexts/AuthContext";
import { resolveCoverImageUrl } from "../../services/mangadex/mangadexHelpers";
import {
  getMyLibraryItems,
  removeLibraryItem,
} from "../../services/library/libraryApi";
import type {
  LibraryItem,
  LibraryStatus,
} from "../../services/library/libraryTypes";

const STATUS_LABELS: Record<LibraryStatus, string> = {
  reading: "Lendo",
  completed: "Concluído",
  planned: "Planejado",
  paused: "Pausado",
  dropped: "Abandonado",
};

function formatLastRead(lastReadAt: string | null): string | null {
  if (!lastReadAt) {
    return null;
  }

  const date = new Date(lastReadAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function LibraryPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    let isActive = true;
    const currentUserId = user.id;

    async function loadLibrary() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const libraryItems = await getMyLibraryItems(currentUserId);

        if (isActive) {
          setItems(libraryItems);
        }
      } catch (error) {
        console.error(error);
        if (isActive) {
          setErrorMessage("Não foi possível carregar sua biblioteca.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadLibrary();

    return () => {
      isActive = false;
    };
  }, [user?.id, isAuthLoading]);

  async function handleRemove(mangaId: string) {
    if (!user) {
      return;
    }

    try {
      setRemovingId(mangaId);

      await removeLibraryItem(user.id, mangaId);

      setItems((prev) => prev.filter((item) => item.manga_id !== mangaId));
    } catch (error) {
      console.error(error);
      setErrorMessage("Não foi possível remover o item da biblioteca.");
    } finally {
      setRemovingId(null);
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

        <div className="home-topbar__spacer" />
      </header>

      <main className="library container">
        <section className="home-welcome">
          <h1 className="home-welcome__title">Sua biblioteca</h1>
          <p className="home-welcome__subtitle">
            Os mangás que você salvou para ler e acompanhar.
          </p>
        </section>

        {!isAuthenticated ? (
          <div className="empty-state">
            <span className="empty-state__icon">🔒</span>
            <p className="empty-state__title">Entre para ver sua biblioteca</p>
            <p className="empty-state__text">
              Faça login para salvar mangás e sincronizar sua leitura.
            </p>
            <Link className="btn btn--primary" to="/login">
              Entrar
            </Link>
          </div>
        ) : isLoading ? (
          <div className="loading">
            <div className="spinner" />
            <p className="loading__text">Carregando sua biblioteca...</p>
          </div>
        ) : errorMessage ? (
          <div className="error-message" role="alert">
            <span className="error-message__icon">⚠️</span>
            <p className="error-message__text">{errorMessage}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">📚</span>
            <p className="empty-state__title">Sua biblioteca está vazia</p>
            <p className="empty-state__text">
              Explore o catálogo e salve mangás para encontrá-los aqui.
            </p>
            <Link className="btn btn--primary" to="/">
              Explorar mangás
            </Link>
          </div>
        ) : (
          <div className="manga-grid">
            {items.map((item) => {
              const lastRead = formatLastRead(item.last_read_at);

              return (
                <div className="manga-card library-card" key={item.manga_id}>
                  <Link
                    className="library-card__link"
                    to={`/manga/${item.manga_id}`}
                  >
                    <div className="manga-card__cover">
                      <MangaCover
                        url={resolveCoverImageUrl(item.cover_url)}
                        alt={`Capa de ${item.title}`}
                      />
                    </div>

                    <div className="manga-card__body">
                      <span className="status-badge">
                        {STATUS_LABELS[item.status]}
                      </span>

                      <h3 className="manga-card__title">{item.title}</h3>

                      <div className="manga-card__meta">
                        <span>
                          {lastRead ? `Lido em ${lastRead}` : "Ainda não lido"}
                        </span>
                      </div>
                    </div>
                  </Link>

                  <button
                    type="button"
                    className="btn btn--danger btn--sm btn--block"
                    onClick={() => handleRemove(item.manga_id)}
                    disabled={removingId === item.manga_id}
                  >
                    {removingId === item.manga_id
                      ? "Removendo..."
                      : "Remover da biblioteca"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
