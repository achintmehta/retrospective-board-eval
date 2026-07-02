import './PresenceBar.css';

export default function PresenceBar({ count, you }) {
  const others = Math.max(0, count - 1);
  return (
    <div className="presence" title={`${count} online`}>
      <div className="presence-you" style={{ background: `linear-gradient(135deg, ${you.color}, ${you.color}aa)` }}>
        {you.initials}
      </div>
      {others > 0 && <span className="presence-count">+{others}</span>}
      <span className="presence-label">
        <span className="presence-dot" /> {count} online
      </span>
    </div>
  );
}
