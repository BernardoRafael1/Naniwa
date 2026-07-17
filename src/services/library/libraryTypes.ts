export type LibraryStatus =
  | "reading"
  | "completed"
  | "planned"
  | "paused"
  | "dropped";

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
