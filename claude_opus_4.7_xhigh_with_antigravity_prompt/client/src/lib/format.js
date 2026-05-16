const RTF = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

const UNITS = [
  ['year', 31536000000],
  ['month', 2628000000],
  ['week', 604800000],
  ['day', 86400000],
  ['hour', 3600000],
  ['minute', 60000],
  ['second', 1000],
];

export function timeAgo(ms) {
  if (!ms) return '';
  const diff = Date.now() - ms;
  const abs = Math.abs(diff);
  if (abs < 30_000) return 'just now';
  for (const [unit, divisor] of UNITS) {
    if (abs >= divisor || unit === 'second') {
      const value = Math.round(-diff / divisor);
      return RTF.format(value, unit);
    }
  }
  return '';
}

export function fullDate(ms) {
  if (!ms) return '';
  return new Date(ms).toLocaleString();
}

export function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

// Stable hash → 0..360 hue range, used for avatar gradients.
export function hashHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return ((h % 360) + 360) % 360;
}

export function avatarGradient(name) {
  const hue = hashHue(name || 'guest');
  const h2 = (hue + 60) % 360;
  return `linear-gradient(135deg, hsl(${hue} 80% 60%), hsl(${h2} 85% 55%))`;
}
