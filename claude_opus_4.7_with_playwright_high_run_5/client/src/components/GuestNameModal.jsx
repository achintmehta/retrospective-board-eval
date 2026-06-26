import { useState } from 'react';

export default function GuestNameModal({ onSubmit, initial = '' }) {
  const [name, setName] = useState(initial);
  const trimmed = name.trim();

  function handleSubmit(e) {
    e.preventDefault();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal" onSubmit={handleSubmit}>
        <h2>Join this retro</h2>
        <p>Enter a display name to participate.</p>
        <input
          autoFocus
          type="text"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your display name"
          aria-label="Display name"
        />
        <button type="submit" disabled={!trimmed}>
          Join board
        </button>
      </form>
    </div>
  );
}
