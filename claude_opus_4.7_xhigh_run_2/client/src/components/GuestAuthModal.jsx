import { useState } from 'react';

export default function GuestAuthModal({ onSubmit }) {
  const [name, setName] = useState('');

  const handle = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="guest-auth-title">
      <div className="modal">
        <h2 id="guest-auth-title">Join this board</h2>
        <p className="muted">Pick a display name so teammates know who you are.</p>
        <form onSubmit={handle}>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={40}
            aria-label="Display name"
          />
          <button type="submit" disabled={!name.trim()}>Join</button>
        </form>
      </div>
    </div>
  );
}
