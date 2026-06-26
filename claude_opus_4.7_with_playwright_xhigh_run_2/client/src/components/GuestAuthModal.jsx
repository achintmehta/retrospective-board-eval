import React, { useState } from 'react';

export default function GuestAuthModal({ onSubmit }) {
  const [name, setName] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim());
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="guest-auth-title">
      <div className="modal">
        <h2 id="guest-auth-title">Join the board</h2>
        <p className="muted">Enter a display name so your teammates know who you are.</p>
        <form onSubmit={handleSubmit} className="modal-form">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={64}
            aria-label="Display name"
          />
          <button type="submit" disabled={!name.trim()}>
            Join board
          </button>
        </form>
      </div>
    </div>
  );
}
