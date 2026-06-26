import { useState } from 'react';

export default function NameModal({ onSubmit }) {
  const [name, setName] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Join board</h2>
        <p>Enter a display name to interact with this retrospective.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoFocus
          />
          <div className="modal-actions">
            <button className="btn" type="submit" disabled={!name.trim()}>
              Join
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
