import { useState } from 'react';

export default function GuestNameModal({ onSubmit }) {
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
        <p className="muted">Enter a display name so others can see who added each card.</p>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            type="text"
            placeholder="Your display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            aria-label="Display name"
          />
          <button type="submit" disabled={!name.trim()}>
            Join Board
          </button>
        </form>
      </div>
    </div>
  );
}
