const KEY = "retro-board.display-name";

export function getDisplayName(): string | null {
  try {
    const value = window.localStorage.getItem(KEY);
    return value && value.trim() ? value : null;
  } catch {
    return null;
  }
}

export function setDisplayName(name: string): void {
  try {
    window.localStorage.setItem(KEY, name.trim());
  } catch {
    // ignore
  }
}

export function clearDisplayName(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
