import { useState, useEffect, useRef } from 'react';

export default function GuestNameModal({ boardTitle, onSubmit }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < 1) {
      setError('Please enter a display name.');
      return;
    }
    if (trimmed.length > 40) {
      setError('Please keep your name under 40 characters.');
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="guest-modal-title">
      <div className="modal modal--small">
        <div className="modal-body">
          <div className="modal-eyebrow">Joining</div>
          <h2 id="guest-modal-title" className="modal-title">
            {boardTitle || 'Retrospective board'}
          </h2>
          <p className="modal-sub">
            Pick a display name so your teammates know whose card is whose.
            No account needed.
          </p>
          <form onSubmit={submit} className="modal-form" id="guest-name-form">
            <label htmlFor="guest-name" className="field-label">
              Your display name
            </label>
            <input
              ref={inputRef}
              id="guest-name"
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Sam from Platform"
              maxLength={40}
              autoComplete="nickname"
              required
            />
            {error && <div className="field-error">{error}</div>}
            <button
              type="submit"
              className="btn btn-primary btn-block"
              id="join-board-btn"
              disabled={!value.trim()}
            >
              Join the board →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
