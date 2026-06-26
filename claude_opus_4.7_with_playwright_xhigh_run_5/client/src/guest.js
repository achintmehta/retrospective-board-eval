const KEY = 'retro_display_name';

export function getDisplayName() {
  try {
    return window.sessionStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function setDisplayName(name) {
  try {
    window.sessionStorage.setItem(KEY, name);
  } catch {
    // ignore storage errors (private mode, etc.)
  }
}

export function clearDisplayName() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
