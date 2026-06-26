// Guest display name is stored per-browser in localStorage so a user does not
// have to re-enter it on every reconnect to the same board.
const KEY = 'retro:displayName';

export function getDisplayName() {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch (_e) {
    return '';
  }
}

export function setDisplayName(name) {
  try {
    if (name) localStorage.setItem(KEY, name);
    else localStorage.removeItem(KEY);
  } catch (_e) {
    // Ignore storage errors (private mode, quota, etc.) — the user can re-enter.
  }
}
