const KEY = 'retro:displayName';

export function getDisplayName(): string | null {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setDisplayName(name: string): void {
  try {
    window.sessionStorage.setItem(KEY, name);
  } catch {
    // ignore
  }
}

export function clearDisplayName(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
