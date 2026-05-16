import { useState } from 'react';

interface Props {
  onSubmit: (name: string) => void;
}

export function GuestNameModal({ onSubmit }: Props) {
  const [name, setName] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Join this board</h2>
        <p className="muted">Enter a display name so others can see who you are.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={40}
          />
          <button type="submit" disabled={!name.trim()}>
            Join board
          </button>
        </form>
      </div>
    </div>
  );
}
