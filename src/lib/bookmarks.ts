import { useSyncExternalStore } from "react";

const BOOKMARKS_STORAGE_KEY = "framescope-bookmarks";
const BOOKMARKS_CHANGED_EVENT = "framescope-bookmarks-changed";
const EMPTY_IDS: string[] = [];

export function toggleBookmarkId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id];
}

// Cached by raw string so repeated reads return a stable array reference
// when nothing changed — required for useSyncExternalStore's getSnapshot,
// which otherwise treats a fresh array on every call as a store update.
let cachedRaw: string | null = null;
let cachedIds: string[] = EMPTY_IDS;

function readIdsFromStorage(): string[] {
  if (typeof window === "undefined") return EMPTY_IDS;
  const raw = window.localStorage.getItem(BOOKMARKS_STORAGE_KEY);
  if (raw === cachedRaw) return cachedIds;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cachedIds = Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : EMPTY_IDS;
  } catch {
    cachedIds = EMPTY_IDS;
  }
  return cachedIds;
}

export function getBookmarkedIds(): string[] {
  return readIdsFromStorage();
}

export function isBookmarked(id: string): boolean {
  return readIdsFromStorage().includes(id);
}

export function toggleBookmark(id: string): string[] {
  const nextIds = toggleBookmarkId(readIdsFromStorage(), id);
  window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(nextIds));
  cachedRaw = null; // force a re-parse on the next read, including our own dispatch below
  window.dispatchEvent(new CustomEvent(BOOKMARKS_CHANGED_EVENT));
  return nextIds;
}

function subscribeToBookmarks(callback: () => void): () => void {
  window.addEventListener(BOOKMARKS_CHANGED_EVENT, callback);
  return () => window.removeEventListener(BOOKMARKS_CHANGED_EVENT, callback);
}

// React-idiomatic subscription to the localStorage-backed bookmark list,
// safe for SSR (getServerSnapshot returns a stable empty array) and free
// of the setState-in-effect pattern used elsewhere for external stores.
export function useBookmarkedIds(): string[] {
  return useSyncExternalStore(subscribeToBookmarks, readIdsFromStorage, () => EMPTY_IDS);
}
