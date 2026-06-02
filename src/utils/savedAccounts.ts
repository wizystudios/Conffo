// Lightweight local store for "saved accounts" shown as avatar chips on the
// auth page. Lets returning users one-tap to pre-fill their email instead
// of typing it again. Avatars + emails only — never passwords.
export type SavedAccount = {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  lastUsed: number;
};

const KEY = 'conffo:savedAccounts';
const MAX = 4;

export function getSavedAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SavedAccount[];
    return Array.isArray(arr) ? arr.sort((a, b) => b.lastUsed - a.lastUsed) : [];
  } catch {
    return [];
  }
}

export function rememberAccount(acc: Omit<SavedAccount, 'lastUsed'>) {
  if (!acc?.id || !acc?.email) return;
  const existing = getSavedAccounts().filter((a) => a.id !== acc.id);
  const next: SavedAccount[] = [{ ...acc, lastUsed: Date.now() }, ...existing].slice(0, MAX);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
}

export function forgetAccount(id: string) {
  const next = getSavedAccounts().filter((a) => a.id !== id);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
}
