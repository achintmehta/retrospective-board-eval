import { useState } from 'react';

export default function GuestAuthModal({ onSubmit }) {
  const [name, setName] = useState('');

  function submit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>Join Board</h2>
        <p>Enter a display name so others know who you are.</p>
        <form onSubmit={submit}>
          <input
            autoFocus
            type="text"
            placeholder="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            aria-label="Display name"
          />
          <button type="submit" disabled={!name.trim()}>Join</button>
        </form>
      </div>
    </div>
  );
}
