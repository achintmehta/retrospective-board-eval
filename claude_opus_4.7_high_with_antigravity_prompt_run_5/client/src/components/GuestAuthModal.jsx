import { useState } from 'react';
import { setDisplayName } from '../lib/session.js';

export default function GuestAuthModal({ onJoin }) {
  const [name, setName] = useState('');
  const trimmed = name.trim();

  function submit(e) {
    e.preventDefault();
    if (!trimmed) return;
    setDisplayName(trimmed);
    onJoin(trimmed);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" id="guest-auth-modal">
      <form className="card modal" onSubmit={submit}>
        <h2>Join the board</h2>
        <p className="sub">
          Pick a display name so your teammates know who&apos;s adding cards and comments.
          No account needed.
        </p>
        <input
          id="guest-display-name"
          type="text"
          autoFocus
          placeholder="e.g. Jordan Park"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
        />
        <div className="modal-actions">
          <button
            type="submit"
            className="btn btn-primary"
            id="guest-auth-submit"
            disabled={!trimmed}
          >
            Enter board →
          </button>
        </div>
      </form>
    </div>
  );
}
