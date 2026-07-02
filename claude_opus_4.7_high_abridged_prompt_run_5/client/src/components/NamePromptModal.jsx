import { useEffect, useRef, useState } from 'react';

export default function NamePromptModal({ initialName = '', onSubmit }) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handle(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    onSubmit(n);
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <form className="modal-card" onSubmit={handle}>
        <div className="modal-eyebrow">Join board</div>
        <h2 className="modal-title">What's your display name?</h2>
        <p className="modal-sub">
          Your teammates will see this next to the cards and comments you add.
        </p>
        <input
          ref={inputRef}
          type="text"
          className="modal-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Ada Lovelace"
          maxLength={80}
          aria-label="Display name"
        />
        <button
          type="submit"
          className="btn btn-primary btn-lg btn-block"
          disabled={!name.trim()}
        >
          Join the board
        </button>
      </form>
    </div>
  );
}
