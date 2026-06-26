const KEY = 'retro_display_name';

export function getDisplayName() {
  try {
    return window.sessionStorage.getItem(KEY) || '';
  } catch (_) {
    return '';
  }
}

export function setDisplayName(name) {
  try {
    window.sessionStorage.setItem(KEY, name);
  } catch (_) {}
}
