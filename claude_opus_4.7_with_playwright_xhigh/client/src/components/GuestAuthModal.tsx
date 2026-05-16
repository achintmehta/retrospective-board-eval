import { FormEvent, useState } from 'react';

interface Props {
  onSubmit: (name: string) => void;
}

export default function GuestAuthModal({ onSubmit }: Props) {
  const [name, setName] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>Join the retrospective</h2>
        <p className="muted">
          Enter a display name so others know who is contributing.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            autoFocus
            aria-label="Display name"
          />
          <button type="submit" disabled={!name.trim()}>
            Join board
          </button>
        </form>
      </div>
    </div>
  );
}
