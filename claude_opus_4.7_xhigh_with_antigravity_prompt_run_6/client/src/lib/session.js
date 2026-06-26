const KEY = 'retro:displayName';

export function getDisplayName() {
  try {
    return window.localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function setDisplayName(name) {
  try {
    window.localStorage.setItem(KEY, name);
  } catch {}
}

export function clearDisplayName() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}
