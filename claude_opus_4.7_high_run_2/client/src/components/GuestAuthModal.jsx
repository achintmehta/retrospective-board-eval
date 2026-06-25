import { useState } from 'react';

export default function GuestAuthModal({ onSubmit }) {
  const [name, setName] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Join board</h2>
        <p className="muted">Enter a display name so others can see who you are.</p>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
          />
          <button type="submit" disabled={!name.trim()}>Join</button>
        </form>
      </div>
    </div>
  );
}
