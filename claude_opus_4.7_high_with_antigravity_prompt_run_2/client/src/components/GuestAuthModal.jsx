import { useState } from 'react';

export default function GuestAuthModal({ onSubmit }) {
  const [name, setName] = useState('');
  const trimmed = name.trim();

  function submit(e) {
    e.preventDefault();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="guest-title">
      <form className="modal glass" onSubmit={submit}>
        <div>
          <h2 id="guest-title">Join the retro</h2>
          <p>Pick a display name so your team knows who added what. No signup needed.</p>
        </div>
        <div className="field">
          <label htmlFor="guest-name">Display name</label>
          <input
            id="guest-name"
            className="input"
            value={name}
            autoFocus
            maxLength={40}
            placeholder="e.g. Alex from Platform"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="row">
          <span className="text-dim" style={{ fontSize: '0.82rem' }}>
            Stays in your browser tab only.
          </span>
          <span className="spacer" />
          <button type="submit" className="btn btn-primary" disabled={!trimmed}>
            Enter board <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
    </div>
  );
}
