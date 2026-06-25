const KEY = 'retro:displayName';

export function getDisplayName() {
  try {
    return localStorage.getItem(KEY) || '';
  } catch (_e) {
    return '';
  }
}

export function setDisplayName(name) {
  try {
    localStorage.setItem(KEY, name);
  } catch (_e) {}
}
