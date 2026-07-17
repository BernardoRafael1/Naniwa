import { supabase } from "../supabase/supabaseClient";
import type { Profile, UpdateProfileInput } from "./userTypes";

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as Profile | null) ?? null;
}

export async function updateMyProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<Profile> {
  // Upsert manual para não depender do alvo de conflito padrão e para
  // permitir limpar campos (enviando null) sem que fiquem "presos".
  const existing = await getMyProfile(userId);

  if (existing) {
    const { data, error } = await supabase
      .from("profiles")
      .update(input)
      .eq("id", userId)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as Profile;
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: userId, ...input })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile;
}
