function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(name) {
  const hue = [...(name || 'Guest')].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
  return `hsl(${hue} 75% 60%)`;
}

export default function ParticipantsBadge({ participants, self }) {
  const list = participants || [];
  const others = list.filter((p) => p.name !== self);
  const total = list.length;

  return (
    <div
      className="participants"
      id="participants-badge"
      title={list.map((p) => p.name).join(', ') || 'No one else here yet'}
    >
      <div className="participants-stack" aria-hidden="true">
        {list.slice(0, 4).map((p) => (
          <span
            key={p.socketId}
            className="avatar avatar--sm"
            style={{ background: avatarColor(p.name) }}
          >
            {initials(p.name)}
          </span>
        ))}
        {list.length > 4 && <span className="avatar avatar--sm avatar--more">+{list.length - 4}</span>}
      </div>
      <span className="participants-label">
        {total === 1
          ? "Just you for now"
          : `${total} online${others.length ? ` (${others.length} other${others.length > 1 ? 's' : ''})` : ''}`}
      </span>
    </div>
  );
}
