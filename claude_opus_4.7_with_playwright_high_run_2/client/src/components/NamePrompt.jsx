import { useState } from 'react';

export default function NamePrompt({ onSubmit }) {
  const [name, setName] = useState('');

  function submit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Join board</h2>
        <p className="muted">Enter a display name so others can see your cards and comments.</p>
        <form onSubmit={submit} className="row-form">
          <input
            type="text"
            autoFocus
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Display name"
            maxLength={64}
          />
          <button type="submit" disabled={!name.trim()}>
            Join
          </button>
        </form>
      </div>
    </div>
  );
}
