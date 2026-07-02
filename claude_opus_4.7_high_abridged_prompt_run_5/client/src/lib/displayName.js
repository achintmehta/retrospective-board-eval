const KEY = 'retro.displayName';

export function getStoredName() {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function saveName(name) {
  try {
    localStorage.setItem(KEY, name);
  } catch {}
}

export function clearName() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
