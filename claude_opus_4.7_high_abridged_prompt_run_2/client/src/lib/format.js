export function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.max(0, Date.now() - Number(ts));
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const d = new Date(Number(ts));
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(Number(ts));
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
