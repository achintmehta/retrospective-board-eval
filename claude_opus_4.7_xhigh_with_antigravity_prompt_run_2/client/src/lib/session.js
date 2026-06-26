const NAME_KEY = 'retro:displayName';
const MAX = 60;

export function getDisplayName() {
  try {
    const value = window.localStorage.getItem(NAME_KEY);
    if (typeof value !== 'string') return '';
    return value.slice(0, MAX);
  } catch {
    return '';
  }
}

export function setDisplayName(name) {
  const trimmed = (name ?? '').toString().trim().slice(0, MAX);
  try {
    if (trimmed) window.localStorage.setItem(NAME_KEY, trimmed);
    else window.localStorage.removeItem(NAME_KEY);
  } catch {
    /* ignore storage errors */
  }
  return trimmed;
}

export function clearDisplayName() {
  try {
    window.localStorage.removeItem(NAME_KEY);
  } catch {
    /* ignore */
  }
}

const palette = [
  '#7c5cff',
  '#22d3ee',
  '#34d399',
  '#ffb45a',
  '#ff7ab8',
  '#a78bfa',
  '#60a5fa',
  '#f472b6',
];

export function colorForName(name) {
  if (!name) return palette[0];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

export function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}
