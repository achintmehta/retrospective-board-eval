import { useState } from 'react';
import './GuestModal.css';

export default function GuestModal({ onSubmit }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card glass-panel animate-scale-in">
        <div className="modal-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h2>Join the Board</h2>
        <p>Enter your display name to start collaborating</p>
        <form onSubmit={handleSubmit}>
          <input
            className="input-field"
            type="text"
            placeholder="Your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            id="guest-name-input"
          />
          <button type="submit" className="btn-primary modal-submit" id="join-board-btn">
            Join Board
          </button>
        </form>
      </div>
    </div>
  );
}
