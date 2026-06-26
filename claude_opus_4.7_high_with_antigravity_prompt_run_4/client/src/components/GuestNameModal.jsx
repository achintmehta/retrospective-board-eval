import React, { useEffect, useRef, useState } from 'react';

export default function GuestNameModal({ initialName = '', onSubmit }) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed.slice(0, 40));
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="guest-modal-title">
      <form className="modal glass" onSubmit={submit} id="guest-name-form">
        <div className="badge-glow" aria-hidden="true" />
        <div className="chip" id="guest-modal-chip">
          <span className="chip-dot" /> Join board
        </div>
        <h2 id="guest-modal-title">What should we call you?</h2>
        <p>Your display name appears next to the cards and comments you create on this board.</p>
        <input
          ref={inputRef}
          id="guest-name-input"
          className="input"
          placeholder="e.g. Avery from Platform"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoComplete="off"
        />
        <button
          type="submit"
          className="btn btn-primary"
          id="guest-name-submit"
          disabled={!name.trim()}
        >
          Join the board →
        </button>
      </form>
    </div>
  );
}
