import { useState } from 'react';

export default function GuestAuthModal({ onJoin }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onJoin(trimmed);
  };

  return (
    <div className="modal-overlay">
      <div className="modal auth-modal">
        <div className="modal-body" style={{ padding: '32px 32px 0' }}>
          <div className="auth-modal-icon">👤</div>
          <h2>Join the Board</h2>
          <p>Enter a display name so your teammates know who you are.</p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              id="guest-name-input"
              className="input"
              placeholder="Your display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              autoComplete="off"
              maxLength={50}
            />
            <button
              id="guest-join-btn"
              type="submit"
              className="btn btn-primary"
              disabled={!name.trim()}
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            >
              Join Board
            </button>
          </form>
        </div>
        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}
