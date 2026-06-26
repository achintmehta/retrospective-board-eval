import { useState } from 'react';

export default function NamePrompt({ onSubmit }) {
  const [name, setName] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed.slice(0, 60));
  }

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={handleSubmit}>
        <h2>Join board</h2>
        <p>Enter a display name to participate in this retrospective.</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoFocus
          maxLength={60}
          aria-label="Display name"
        />
        <button type="submit" disabled={!name.trim()}>
          Join
        </button>
      </form>
    </div>
  );
}
