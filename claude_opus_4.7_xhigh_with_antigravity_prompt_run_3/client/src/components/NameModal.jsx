import { useEffect, useRef, useState } from 'react';
import { setDisplayName } from '../session.js';

export default function NameModal({ onSubmit }) {
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a display name.');
      return;
    }
    if (trimmed.length > 60) {
      setError('Names must be 60 characters or fewer.');
      return;
    }
    setDisplayName(trimmed);
    onSubmit(trimmed);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="name-modal-title">
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title" id="name-modal-title">Join this retro</div>
            <div className="modal-subtitle">Pick a display name so the team knows who&rsquo;s contributing.</div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="modal-form" id="name-modal-form" style={{ padding: '22px 26px 24px' }}>
          <div className="field">
            <label className="field-label" htmlFor="display-name-input">Display name</label>
            <input
              ref={inputRef}
              id="display-name-input"
              className="input"
              type="text"
              placeholder="e.g. Avery Chen"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              maxLength={60}
              autoComplete="nickname"
            />
            <span className="field-hint">Only stored in your browser tab — no account needed.</span>
          </div>
          {error && <div className="banner is-error">{error}</div>}
          <button type="submit" className="btn btn-primary" id="display-name-submit">
            Continue to board
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
          </button>
        </form>
      </div>
    </div>
  );
}
