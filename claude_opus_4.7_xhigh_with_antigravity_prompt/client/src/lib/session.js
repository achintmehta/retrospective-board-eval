const KEY = 'retro.displayName';

export function getDisplayName() {
  try {
    return sessionStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function setDisplayName(name) {
  try {
    if (name) sessionStorage.setItem(KEY, name);
    else sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
