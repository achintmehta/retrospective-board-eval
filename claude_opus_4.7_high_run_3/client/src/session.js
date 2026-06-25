const KEY = 'retro:displayName';

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
    /* ignore */
  }
}

export function clearDisplayName() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
