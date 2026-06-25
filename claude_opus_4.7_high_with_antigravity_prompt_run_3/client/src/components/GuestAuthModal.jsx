import { useState } from 'react';

export default function GuestAuthModal({ boardTitle, onSubmit }) {
  const [name, setName] = useState('');
  const trimmed = name.trim();

  function handleSubmit(e) {
    e.preventDefault();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="guest-modal-title">
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
        </div>
        <h2 id="guest-modal-title">Join the retro</h2>
        <p>
          Joining <strong>{boardTitle || 'this board'}</strong>. Pick a display name so your
          teammates can recognise your cards and comments.
        </p>
        <label className="field-label" htmlFor="guest-name-input">
          Display name
        </label>
        <input
          id="guest-name-input"
          className="input"
          placeholder="e.g. Sasha"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoFocus
        />
        <div className="modal__actions">
          <button type="submit" className="btn btn--primary" disabled={!trimmed} id="join-board-btn">
            Join board
          </button>
        </div>
      </form>
    </div>
  );
}
