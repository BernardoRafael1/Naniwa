import { supabase } from "../supabase/supabaseClient";
import type {
  UpdateUserPreferencesInput,
  UserPreferences,
} from "./userTypes";

export async function getMyPreferences(
  userId: string
): Promise<UserPreferences | null> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as UserPreferences | null) ?? null;
}

export async function updateMyPreferences(
  userId: string,
  input: UpdateUserPreferencesInput
): Promise<UserPreferences> {
  // Upsert manual para não depender do alvo de conflito padrão.
  const existing = await getMyPreferences(userId);

  if (existing) {
    const { data, error } = await supabase
      .from("user_preferences")
      .update(input)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as UserPreferences;
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .insert({ user_id: userId, ...input })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as UserPreferences;
}
