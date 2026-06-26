import { useState } from 'react';

export default function NamePrompt({ onSubmit }) {
  const [value, setValue] = useState('');
  return (
    <div className="modal-backdrop">
      <div className="modal card">
        <h2>Join board</h2>
        <p className="muted">Enter a display name so others can see who you are.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = value.trim();
            if (trimmed) onSubmit(trimmed);
          }}
        >
          <input
            autoFocus
            type="text"
            placeholder="Your name"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={40}
            required
            aria-label="Display name"
          />
          <button type="submit" disabled={!value.trim()}>
            Join
          </button>
        </form>
      </div>
    </div>
  );
}
