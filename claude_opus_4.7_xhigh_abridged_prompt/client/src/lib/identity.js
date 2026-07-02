const KEY = 'retro:displayName';

export function getDisplayName() {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function setDisplayName(name) {
  try {
    if (name) localStorage.setItem(KEY, name);
    else localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}

const PALETTE = [
  ['#7c5cff', '#22d3ee'],
  ['#f472b6', '#7c5cff'],
  ['#22d3ee', '#4ade80'],
  ['#fbbf24', '#f472b6'],
  ['#4ade80', '#22d3ee'],
  ['#f87171', '#fbbf24'],
  ['#a78bfa', '#22d3ee'],
  ['#38bdf8', '#a78bfa'],
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function avatarGradient(name) {
  if (!name) return `linear-gradient(135deg, ${PALETTE[0][0]}, ${PALETTE[0][1]})`;
  const [a, b] = PALETTE[hashString(name) % PALETTE.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

export function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function formatRelative(ts) {
  if (!ts) return '';
  const diff = Date.now() - Number(ts);
  const abs = Math.abs(diff);
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (abs < min) return 'just now';
  if (abs < hr) return `${Math.floor(abs / min)}m ago`;
  if (abs < day) return `${Math.floor(abs / hr)}h ago`;
  if (abs < 7 * day) return `${Math.floor(abs / day)}d ago`;
  return new Date(Number(ts)).toLocaleDateString();
}
