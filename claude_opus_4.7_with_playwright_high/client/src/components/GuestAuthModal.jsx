import { useState } from 'react';

export default function GuestAuthModal({ onSubmit }) {
  const [name, setName] = useState('');

  function submit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={submit}>
        <h2>Join this board</h2>
        <p className="muted">
          Enter a display name. Others will see this next to your cards and comments.
        </p>
        <input
          type="text"
          autoFocus
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
        />
        <button type="submit" disabled={!name.trim()}>
          Join board
        </button>
      </form>
    </div>
  );
}
