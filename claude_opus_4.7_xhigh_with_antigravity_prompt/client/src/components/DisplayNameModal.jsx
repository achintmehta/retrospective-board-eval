import { useEffect, useRef, useState } from 'react';

export default function DisplayNameModal({ initial = '', boardTitle, onSubmit, onCancel }) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select?.();
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && onCancel) onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  function submit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="display-name-title">
      <form className="modal" onSubmit={submit} id="display-name-form">
        <h2 id="display-name-title">Join the retro</h2>
        <p className="lead">
          {boardTitle ? (
            <>You're joining <strong>{boardTitle}</strong>. Pick a display name so the team can see who's contributing.</>
          ) : (
            <>Pick a display name so the team can see who's contributing.</>
          )}
        </p>
        <div className="field">
          <label className="label" htmlFor="display-name-input">Display name</label>
          <input
            id="display-name-input"
            ref={inputRef}
            className="input"
            value={value}
            placeholder="e.g. Ada Lovelace"
            maxLength={60}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="nickname"
          />
        </div>
        <div className="modal-actions">
          {onCancel && (
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            id="display-name-submit"
            disabled={!value.trim()}
          >
            Join board
          </button>
        </div>
      </form>
    </div>
  );
}
