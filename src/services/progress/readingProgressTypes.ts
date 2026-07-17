export type ReadingProgress = {
  user_id: string;
  manga_id: string;
  chapter_id: string;
  chapter_title: string | null;
  page: number;
  total_pages: number;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export type UpsertReadingProgressInput = {
  manga_id: string;
  chapter_id: string;
  chapter_title?: string | null;
  page: number;
  total_pages: number;
  completed: boolean;
};
