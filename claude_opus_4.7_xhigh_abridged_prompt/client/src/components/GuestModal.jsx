import { useEffect, useRef, useState } from 'react';

export default function GuestModal({ boardTitle, onSubmit }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = (event) => {
    event.preventDefault();
    const clean = name.trim();
    if (clean.length >= 2) onSubmit(clean);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Enter your display name">
      <div className="modal">
        <h2>Join the board</h2>
        <p>Enter a display name so your teammates know who's contributing.</p>
        {boardTitle ? <div className="card-preview">{boardTitle}</div> : null}
        <form onSubmit={submit} className="stack gap-4">
          <div>
            <label className="field-label" htmlFor="guest-name">Display name</label>
            <input
              id="guest-name"
              ref={inputRef}
              className="input"
              placeholder="e.g. Alex Chen"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              minLength={2}
              required
            />
          </div>
          <div className="modal-actions">
            <button className="btn btn-primary" type="submit" disabled={name.trim().length < 2}>
              Join board
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
