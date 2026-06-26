import { useState } from 'react';

export default function GuestNameModal({ onSubmit }) {
  const [name, setName] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Enter your display name">
      <form className="modal" onSubmit={handleSubmit}>
        <h2>Join Board</h2>
        <p>Enter a display name to start collaborating.</p>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your display name"
          maxLength={60}
          aria-label="Display name"
        />
        <button type="submit" disabled={!name.trim()}>Join</button>
      </form>
    </div>
  );
}
