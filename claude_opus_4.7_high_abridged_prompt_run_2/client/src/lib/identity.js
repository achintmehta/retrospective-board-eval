const KEY = 'retro.displayName';

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

const PALETTE = [
  '#7c5cff',
  '#3ec1ff',
  '#ff5cad',
  '#34d399',
  '#fbbf24',
  '#f87171',
  '#a78bfa',
  '#60a5fa',
];

export function colorForName(name) {
  const s = String(name || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function initialsFor(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
