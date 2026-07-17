import { supabase } from "../supabase/supabaseClient";
import type {
  LibraryItem,
  UpdateLibraryItemInput,
  UpsertLibraryItemInput,
} from "./libraryTypes";

export async function getMyLibraryItems(
  userId: string
): Promise<LibraryItem[]> {
  const { data, error } = await supabase
    .from("library_items")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as LibraryItem[] | null) ?? [];
}

export async function getLibraryItem(
  userId: string,
  mangaId: string
): Promise<LibraryItem | null> {
  const { data, error } = await supabase
    .from("library_items")
    .select("*")
    .eq("user_id", userId)
    .eq("manga_id", mangaId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as LibraryItem | null) ?? null;
}

export async function upsertLibraryItem(
  userId: string,
  input: UpsertLibraryItemInput
): Promise<LibraryItem> {
  // Upsert manual (select + insert/update) para não depender de uma
  // constraint única (user_id, manga_id) que pode não existir no banco.
  const existing = await getLibraryItem(userId, input.manga_id);

  if (existing) {
    return updateLibraryItem(userId, input.manga_id, {
      title: input.title,
      cover_url: input.cover_url,
      status: input.status,
    });
  }

  const { data, error } = await supabase
    .from("library_items")
    .insert({ user_id: userId, ...input })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as LibraryItem;
}

export async function updateLibraryItem(
  userId: string,
  mangaId: string,
  input: UpdateLibraryItemInput
): Promise<LibraryItem> {
  const { data, error } = await supabase
    .from("library_items")
    .update(input)
    .eq("user_id", userId)
    .eq("manga_id", mangaId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as LibraryItem;
}

export async function removeLibraryItem(
  userId: string,
  mangaId: string
): Promise<void> {
  const { error } = await supabase
    .from("library_items")
    .delete()
    .eq("user_id", userId)
    .eq("manga_id", mangaId);

  if (error) {
    throw new Error(error.message);
  }
}
