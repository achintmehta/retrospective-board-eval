import { useEffect, useRef, useState } from 'react';
import './GuestAuthModal.css';

export default function GuestAuthModal({ open, initialName = '', boardTitle, onSubmit }) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef(null);

  useEffect(() => {
    setName(initialName);
  }, [initialName, open]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="guest-modal-title">
      <div className="modal-card glass">
        <div className="modal-accent" />
        <header className="modal-header">
          <span className="badge"><span className="badge-dot" />Joining live session</span>
          <h2 id="guest-modal-title">What should we call you?</h2>
          {boardTitle && (
            <p className="modal-subtitle">
              You’re about to join <strong>{boardTitle}</strong>. Pick a display name so
              teammates can see who added what.
            </p>
          )}
        </header>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="label" htmlFor="guest-name">Display name</label>
          <input
            ref={inputRef}
            id="guest-name"
            className="input"
            type="text"
            value={name}
            placeholder="e.g. Mira S."
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary modal-submit" disabled={!name.trim()}>
            Join board →
          </button>
          <p className="modal-hint">
            Your name is saved locally so you won't need to enter it again on this device.
          </p>
        </form>
      </div>
    </div>
  );
}
