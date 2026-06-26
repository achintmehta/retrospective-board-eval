import { useEffect, useRef, useState } from 'react';
import { setStoredName } from '../lib/identity';

export default function GuestAuthModal({ defaultName = '', onSubmit }) {
  const [name, setName] = useState(defaultName);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setStoredName(trimmed);
    onSubmit(trimmed);
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-auth-title"
    >
      <form className="modal" onSubmit={submit}>
        <div>
          <h2 id="guest-auth-title">Join this retrospective</h2>
          <p className="subtitle">
            Enter a display name so others can see your contributions. No account needed.
          </p>
        </div>
        <input
          ref={inputRef}
          id="guest-name-input"
          className="input"
          placeholder="e.g. Alex from Platform"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={48}
          required
        />
        <div className="modal-actions">
          <button
            type="submit"
            id="guest-join-button"
            className="btn btn-primary"
            disabled={!name.trim()}
          >
            Join board →
          </button>
        </div>
      </form>
    </div>
  );
}
