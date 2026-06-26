const KEY = 'retro-display-name';

export function getDisplayName() {
  try {
    return localStorage.getItem(KEY) || '';
  } catch (_) {
    return '';
  }
}

export function setDisplayName(name) {
  try {
    localStorage.setItem(KEY, name);
  } catch (_) {}
}

export function clearDisplayName() {
  try {
    localStorage.removeItem(KEY);
  } catch (_) {}
}
