// Tracks which users' confessions the current viewer has already seen.
// Persists across pages/reloads so green rings turn grey reliably.

const KEY = 'conffo_viewed_user_confessions_v1';

function readMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, number>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {}
}

/** Mark a user's confessions as fully viewed at the given timestamp (ms). */
export function markUserConfessionsViewed(userId: string, latestTs: number = Date.now()) {
  if (!userId) return;
  const map = readMap();
  if (!map[userId] || latestTs > map[userId]) {
    map[userId] = latestTs;
    writeMap(map);
    window.dispatchEvent(new CustomEvent('viewed-confessions-changed'));
  }
}

/** Returns true if all of the user's known confessions (up to latestTs) have been viewed. */
export function hasUserBeenViewed(userId: string, latestTs: number): boolean {
  if (!userId) return false;
  const map = readMap();
  const viewedAt = map[userId] || 0;
  return viewedAt >= latestTs;
}

export function getViewedMap(): Record<string, number> {
  return readMap();
}
