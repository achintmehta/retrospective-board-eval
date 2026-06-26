// Guest "session" — a display name stored in sessionStorage so it survives
// reloads of the same tab but expires when the tab closes. That matches the
// "guest auth modal" requirement without persisting any identity.
const KEY = 'retroboard.displayName';

export function getDisplayName() {
  try {
    return sessionStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function setDisplayName(name) {
  try {
    sessionStorage.setItem(KEY, name);
  } catch {
    // sessionStorage may be unavailable in some private modes; ignore.
  }
}

export function clearDisplayName() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function initialsOf(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
