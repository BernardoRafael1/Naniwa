export type ThemePreference = "system" | "light" | "dark";
export type ReaderMode = "single-page" | "continuous";
export type ReaderDirection = "ltr" | "rtl";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type UserPreferences = {
  user_id: string;
  theme: ThemePreference;
  default_language: string;
  reader_mode: ReaderMode;
  reader_direction: ReaderDirection;
  created_at: string;
  updated_at: string;
};

export type UpdateProfileInput = {
  display_name?: string | null;
  avatar_url?: string | null;
};

export type UpdateUserPreferencesInput = {
  theme?: ThemePreference;
  default_language?: string;
  reader_mode?: ReaderMode;
  reader_direction?: ReaderDirection;
};
