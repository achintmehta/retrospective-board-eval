import { useState } from 'react';

export default function GuestAuthModal({ onSubmit, initial = '' }) {
  const [name, setName] = useState(initial);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal" onSubmit={handleSubmit}>
        <h2>Join board</h2>
        <p>
          Enter a display name so your teammates can see who added each card.
          Your name is only saved for this browser session.
        </p>
        <input
          autoFocus
          aria-label="Display name"
          placeholder="e.g. Alex Chen"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
        />
        <div className="actions">
          <button className="primary" type="submit" disabled={!name.trim()}>
            Join
          </button>
        </div>
      </form>
    </div>
  );
}
