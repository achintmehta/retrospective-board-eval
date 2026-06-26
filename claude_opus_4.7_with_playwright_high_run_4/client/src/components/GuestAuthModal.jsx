import { useState } from 'react';

export default function GuestAuthModal({ onSubmit }) {
  const [name, setName] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="guest-modal-title">
      <form className="modal" onSubmit={handleSubmit}>
        <h2 id="guest-modal-title">Join board</h2>
        <p>Enter a display name to start collaborating.</p>
        <input
          autoFocus
          type="text"
          placeholder="Your display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={64}
          aria-label="Display name"
        />
        <button type="submit" disabled={!name.trim()}>Join</button>
      </form>
    </div>
  );
}
