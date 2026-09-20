"use client";

const KEY = "embellish-liked-ids";

export function getLikedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function toggleLikedId(id: string): boolean {
  const ids = getLikedIds();
  const nowLiked = !ids.has(id);
  if (nowLiked) ids.add(id);
  else ids.delete(id);
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...ids]));
  } catch {
    // ignore — storage may be unavailable (private mode, quota, etc.)
  }
  return nowLiked;
}
