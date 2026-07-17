export type LibraryStatus = "reading" | "planned" | "completed" | "dropped";

export const LIBRARY_STATUSES: LibraryStatus[] = [
  "reading",
  "planned",
  "completed",
  "dropped",
];

/**
 * Normaliza o status vindo do banco para os valores oficiais do frontend.
 * Dados antigos com "paused" (ou qualquer valor inesperado) viram "planned".
 */
export function normalizeLibraryStatus(
  status: string | null | undefined
): LibraryStatus {
  if (status === "reading" || status === "completed" || status === "dropped") {
    return status;
  }

  return "planned";
}

export type LibraryItem = {
  user_id: string;
  manga_id: string;
  title: string;
  cover_url: string | null;
  status: LibraryStatus;
  last_chapter_id: string | null;
  last_chapter_title: string | null;
  last_page: number | null;
  total_pages: number | null;
  last_read_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UpsertLibraryItemInput = {
  manga_id: string;
  title: string;
  cover_url?: string | null;
  status?: LibraryStatus;
};

export type UpdateLibraryItemInput = {
  title?: string;
  cover_url?: string | null;
  status?: LibraryStatus;
  last_chapter_id?: string | null;
  last_chapter_title?: string | null;
  last_page?: number | null;
  total_pages?: number | null;
  last_read_at?: string | null;
};
