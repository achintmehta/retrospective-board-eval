import { useState, useEffect, useRef } from 'react';
import './GuestAuthModal.css';

export default function GuestAuthModal({ boardTitle, onSubmit }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <div className="modal-backdrop animate-fade-in">
      <div className="modal glass animate-pop-in" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div className="modal-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h2 className="modal-title">Join the retro</h2>
          <p className="modal-subtitle">
            You're about to join <strong>{boardTitle || 'this board'}</strong>. Pick a display name so
            everyone knows who added what.
          </p>
        </div>

        <form onSubmit={submit} className="modal-form">
          <label className="modal-label" htmlFor="displayName">
            Display name
          </label>
          <input
            id="displayName"
            ref={inputRef}
            className="input"
            placeholder="e.g. Alex R."
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
          />
          <button type="submit" className="btn btn-primary modal-submit" disabled={!name.trim()}>
            Enter board
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>

        <p className="modal-note">
          No account or password required — this is a guest session for this board only.
        </p>
      </div>
    </div>
  );
}
