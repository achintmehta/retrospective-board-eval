export function formatRelative(ts) {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

const PALETTE = [
  ['#8b5cf6', '#ec4899'],
  ['#06b6d4', '#3b82f6'],
  ['#f59e0b', '#ef4444'],
  ['#10b981', '#06b6d4'],
  ['#f472b6', '#a855f7'],
  ['#facc15', '#f97316'],
];

export function colorFor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
