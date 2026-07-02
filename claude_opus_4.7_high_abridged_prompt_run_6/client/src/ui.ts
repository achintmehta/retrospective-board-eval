const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #8b5cf6, #ec4899)',
  'linear-gradient(135deg, #38bdf8, #8b5cf6)',
  'linear-gradient(135deg, #34d399, #22d3ee)',
  'linear-gradient(135deg, #f472b6, #fb923c)',
  'linear-gradient(135deg, #fbbf24, #f472b6)',
  'linear-gradient(135deg, #22d3ee, #6366f1)',
];

const COLUMN_SWATCHES = [
  'linear-gradient(135deg, #34d399, #22d3ee)',
  'linear-gradient(135deg, #f472b6, #fb923c)',
  'linear-gradient(135deg, #38bdf8, #8b5cf6)',
  'linear-gradient(135deg, #fbbf24, #ec4899)',
  'linear-gradient(135deg, #8b5cf6, #ec4899)',
  'linear-gradient(135deg, #22d3ee, #6366f1)',
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function colorFor(name: string): string {
  return AVATAR_GRADIENTS[hash(name) % AVATAR_GRADIENTS.length];
}

export function swatchFor(index: number): string {
  return COLUMN_SWATCHES[index % COLUMN_SWATCHES.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '?';
  const second = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + second).toUpperCase();
}

export function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = 60 * 1000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diff < min) return 'just now';
  if (diff < hr) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hr)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(ts).toLocaleDateString();
}
