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
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="guest-modal-title">
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-icon" aria-hidden="true">✦</div>
        <h2 id="guest-modal-title">Welcome to the board</h2>
        <p>Pick a display name so teammates know who's contributing. You can change it later by clearing your browser storage.</p>
        <div className="modal-form">
          <label className="field-label" htmlFor="display-name">Display name</label>
          <input
            id="display-name"
            className="input"
            type="text"
            maxLength={40}
            placeholder="e.g. Avery Chen"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button className="btn btn-primary" type="submit" disabled={!name.trim()}>
            Join the board
          </button>
        </div>
      </form>
    </div>
  );
}
