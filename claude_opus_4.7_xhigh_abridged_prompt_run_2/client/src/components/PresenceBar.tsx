import './PresenceBar.css';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #7c5cff, #22d3ee)',
  'linear-gradient(135deg, #f472b6, #fbbf24)',
  'linear-gradient(135deg, #34d399, #22d3ee)',
  'linear-gradient(135deg, #a78bfa, #f472b6)',
  'linear-gradient(135deg, #22d3ee, #7c5cff)',
  'linear-gradient(135deg, #fb7185, #f472b6)',
];

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '·';
}
function gradientFor(name: string): string {
  return AVATAR_GRADIENTS[hashString(name) % AVATAR_GRADIENTS.length];
}

interface PresenceBarProps {
  users: string[];
}

export default function PresenceBar({ users }: PresenceBarProps) {
  if (users.length === 0) return <div className="presence-bar" aria-hidden />;

  const displayed = users.slice(0, 8);
  const overflow = users.length - displayed.length;

  return (
    <div className="presence-bar">
      <div className="presence-inner">
        <span className="text-tertiary tiny">In this board</span>
        <div className="presence-avatars">
          {displayed.map((name) => (
            <span
              key={name}
              className="presence-avatar"
              style={{ background: gradientFor(name) }}
              title={name}
            >
              {initials(name)}
            </span>
          ))}
          {overflow > 0 && (
            <span className="presence-avatar overflow">+{overflow}</span>
          )}
        </div>
        <span className="presence-names text-secondary tiny">
          {users.slice(0, 3).join(', ')}
          {users.length > 3 ? ` +${users.length - 3} more` : ''}
        </span>
      </div>
    </div>
  );
}
