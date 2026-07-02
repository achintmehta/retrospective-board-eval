const KEY = 'retro.displayName';

export function getDisplayName(): string | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

export function setDisplayName(name: string): void {
  try {
    window.localStorage.setItem(KEY, name.trim());
  } catch {
    /* ignore */
  }
}
