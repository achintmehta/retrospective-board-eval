import { useState } from 'react';

export default function GuestAuthModal({ onSubmit }) {
  const [name, setName] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>Join this board</h2>
        <p className="muted">Enter a display name to start collaborating.</p>
        <form onSubmit={handleSubmit} className="inline-form">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your display name"
            maxLength={40}
            aria-label="Display name"
          />
          <button type="submit" disabled={!name.trim()}>
            Join
          </button>
        </form>
      </div>
    </div>
  );
}
