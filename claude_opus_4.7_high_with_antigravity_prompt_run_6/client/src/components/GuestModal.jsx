import { useState } from 'react';

export default function GuestModal({ onSubmit }) {
  const [name, setName] = useState('');

  function handle(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="guest-modal-title">
      <div className="modal glass">
        <h2 id="guest-modal-title">Join the retro</h2>
        <p className="muted">
          Pick a display name so your teammates can see who added what.
        </p>
        <form onSubmit={handle}>
          <input
            id="guest-display-name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={48}
          />
          <button id="guest-join-button" type="submit" disabled={!name.trim()}>
            Join board
          </button>
        </form>
      </div>
    </div>
  );
}
