import { FormEvent, useState } from 'react';

export default function GuestAuthModal({
  onSubmit,
}: {
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-inner">
          <h2>Join the retro</h2>
          <p>
            Pick a display name so your teammates know who's adding cards and
            comments. This stays in your browser session — no account required.
          </p>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              autoFocus
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
            <button
              type="submit"
              className="primary-btn"
              disabled={!name.trim()}
            >
              Enter board →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
