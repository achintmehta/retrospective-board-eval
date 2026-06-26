const KEY = 'retro-display-name';

export function getDisplayName() {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function setDisplayName(name) {
  try {
    localStorage.setItem(KEY, name);
  } catch {
    // ignore
  }
}

export function clearDisplayName() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
