const KEY = 'retro:displayName';

export function getDisplayName(): string | null {
  const v = localStorage.getItem(KEY);
  return v && v.trim() ? v : null;
}

export function setDisplayName(name: string): void {
  localStorage.setItem(KEY, name.trim().slice(0, 40));
}

export function clearDisplayName(): void {
  localStorage.removeItem(KEY);
}
