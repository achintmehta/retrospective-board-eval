import React, { useState } from 'react';

export default function GuestModal({ onJoin }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(name.trim());
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>
          Welcome to <span className="gradient-text">Retro Board</span>
        </h2>
        <p>Enter your display name to join this retrospective.</p>
        <form onSubmit={handleSubmit}>
          <input
            id="display-name-input"
            type="text"
            placeholder="Your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-primary" id="join-board-btn">
            Join Board
          </button>
        </form>
      </div>
    </div>
  );
}
