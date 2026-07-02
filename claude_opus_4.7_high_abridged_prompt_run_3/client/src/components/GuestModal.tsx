import { FormEvent, useState } from 'react';

interface Props {
  onSubmit: (name: string) => void;
}

export default function GuestModal({ onSubmit }: Props) {
  const [name, setName] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-badge" aria-hidden>👋</div>
        <h2>Welcome to the retro</h2>
        <p className="modal-sub">
          Pick a display name — it’ll appear on your cards and comments.
        </p>
        <form onSubmit={handleSubmit} className="modal-form">
          <input
            autoFocus
            className="input"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!name.trim()}
          >
            Join board
          </button>
        </form>
      </div>
    </div>
  );
}
