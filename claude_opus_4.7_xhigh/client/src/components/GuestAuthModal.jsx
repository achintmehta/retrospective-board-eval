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
      <form onSubmit={handleSubmit} className="modal">
        <h2>Join this retro</h2>
        <p className="muted">Pick a display name so others know who you are.</p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Achint"
          maxLength={40}
        />
        <button type="submit" disabled={!name.trim()}>
          Join board
        </button>
      </form>
    </div>
  );
}
