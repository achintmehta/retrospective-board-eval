const KEY = 'retro:displayName';

export function getDisplayName() {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function setDisplayName(name) {
  const trimmed = String(name || '').trim().slice(0, 64);
  try {
    if (trimmed) {
      localStorage.setItem(KEY, trimmed);
    } else {
      localStorage.removeItem(KEY);
    }
  } catch {
    /* ignore */
  }
  return trimmed;
}

export function clearDisplayName() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
