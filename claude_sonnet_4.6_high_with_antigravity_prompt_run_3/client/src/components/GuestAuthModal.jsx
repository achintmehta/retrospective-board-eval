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
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="guest-modal-title">
        <div className="guest-modal-icon">👤</div>
        <h2 className="modal-title" id="guest-modal-title">Join this board</h2>
        <p className="modal-subtitle">Enter a display name to start collaborating in real-time. No account needed.</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="display-name-input">Display Name</label>
            <input
              id="display-name-input"
              className="form-input"
              type="text"
              placeholder="e.g. Alex Chen"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              required
              maxLength={40}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={!name.trim()} id="join-board-btn">
            ⚡ Join Board
          </button>
        </form>
      </div>
    </div>
  );
}
