const KEY = 'retro-display-name';

export function getStoredName() {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredName(name) {
  try {
    if (name) localStorage.setItem(KEY, name);
  } catch {}
}

export function clearStoredName() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

export function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || name[0].toUpperCase();
}

const COLUMN_ACCENTS = [
  'linear-gradient(135deg, hsl(150 80% 60%), hsl(192 100% 60%))',
  'linear-gradient(135deg, hsl(326 100% 68%), hsl(40 100% 65%))',
  'linear-gradient(135deg, hsl(258 100% 70%), hsl(192 100% 60%))',
  'linear-gradient(135deg, hsl(40 100% 65%), hsl(326 100% 68%))',
  'linear-gradient(135deg, hsl(192 100% 60%), hsl(258 100% 70%))',
  'linear-gradient(135deg, hsl(150 80% 60%), hsl(258 100% 70%))',
];

export function columnAccent(index) {
  return COLUMN_ACCENTS[index % COLUMN_ACCENTS.length];
}
