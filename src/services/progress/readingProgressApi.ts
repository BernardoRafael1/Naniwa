import { supabase } from "../supabase/supabaseClient";
import type {
  ReadingProgress,
  UpsertReadingProgressInput,
} from "./readingProgressTypes";

export async function getChapterProgress(
  userId: string,
  chapterId: string
): Promise<ReadingProgress | null> {
  const { data, error } = await supabase
    .from("reading_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("chapter_id", chapterId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ReadingProgress | null) ?? null;
}

export async function getMangaProgress(
  userId: string,
  mangaId: string
): Promise<ReadingProgress[]> {
  const { data, error } = await supabase
    .from("reading_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("manga_id", mangaId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as ReadingProgress[] | null) ?? [];
}

export async function getRecentReadingProgress(
  userId: string,
  limit = 12
): Promise<ReadingProgress[]> {
  const { data, error } = await supabase
    .from("reading_progress")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data as ReadingProgress[] | null) ?? [];
}

export async function upsertReadingProgress(
  userId: string,
  input: UpsertReadingProgressInput
): Promise<ReadingProgress> {
  // Upsert manual para não depender de uma constraint única
  // (user_id, chapter_id) que pode não existir no banco.
  const existing = await getChapterProgress(userId, input.chapter_id);

  if (existing) {
    const { data, error } = await supabase
      .from("reading_progress")
      .update({
        manga_id: input.manga_id,
        chapter_title: input.chapter_title,
        page: input.page,
        total_pages: input.total_pages,
        // "completed" é fixo: uma vez concluído, permanece concluído.
        completed: input.completed || existing.completed,
      })
      .eq("user_id", userId)
      .eq("chapter_id", input.chapter_id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as ReadingProgress;
  }

  const { data, error } = await supabase
    .from("reading_progress")
    .insert({ user_id: userId, ...input })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ReadingProgress;
}
