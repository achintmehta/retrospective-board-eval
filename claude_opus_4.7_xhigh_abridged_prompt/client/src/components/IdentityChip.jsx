import { useEffect, useState } from 'react';
import { getDisplayName, avatarGradient, initials, setDisplayName } from '../lib/identity.js';

export default function IdentityChip() {
  const [name, setName] = useState('');

  useEffect(() => {
    setName(getDisplayName());
    const handler = () => setName(getDisplayName());
    window.addEventListener('storage', handler);
    window.addEventListener('retro:identity', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('retro:identity', handler);
    };
  }, []);

  if (!name) return null;

  const clear = () => {
    setDisplayName('');
    window.dispatchEvent(new Event('retro:identity'));
  };

  return (
    <button
      type="button"
      className="identity-chip"
      title="Change display name"
      onClick={clear}
    >
      <span
        className="avatar"
        style={{ background: avatarGradient(name), width: 22, height: 22, border: 'none' }}
      >
        {initials(name)}
      </span>
      <span>{name}</span>
    </button>
  );
}
