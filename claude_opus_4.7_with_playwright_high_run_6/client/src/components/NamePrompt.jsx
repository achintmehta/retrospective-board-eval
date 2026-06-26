import { useState } from 'react';

export default function NamePrompt({ onSubmit }) {
  const [name, setName] = useState('');
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Join the retro</h2>
        <p className="muted">Enter a display name to participate in this board.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = name.trim();
            if (trimmed) onSubmit(trimmed);
          }}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
            required
          />
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
            Join board
          </button>
        </form>
      </div>
    </div>
  );
}
