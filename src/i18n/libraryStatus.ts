import type { LibraryStatus } from "../services/library/libraryTypes";
import type { TranslationKey } from "./translations";

/** Chave de tradução do rótulo de cada status da biblioteca. */
export const LIBRARY_STATUS_LABEL_KEY: Record<LibraryStatus, TranslationKey> = {
  reading: "status.reading",
  planned: "status.planned",
  completed: "status.completed",
  dropped: "status.dropped",
};
