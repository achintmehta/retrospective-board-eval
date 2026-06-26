import { useState } from 'react';

export default function GuestAuthModal({ defaultName = '', onSubmit }) {
  const [name, setName] = useState(defaultName);
  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }
  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={handleSubmit}>
        <h2>Join this board</h2>
        <p className="muted">Enter a display name to participate.</p>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={80}
          required
        />
        <button type="submit" disabled={!name.trim()}>
          Continue
        </button>
      </form>
    </div>
  );
}
