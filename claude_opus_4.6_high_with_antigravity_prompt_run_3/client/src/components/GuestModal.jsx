import React, { useState } from 'react';
import './GuestModal.css';

export default function GuestModal({ onSubmit }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <div className="modal-overlay">
      <div className="guest-modal glass-card animate-slide-in">
        <div className="modal-glow" />
        <h2>Welcome to the Retro!</h2>
        <p className="modal-subtitle">Enter a display name to start collaborating</p>
        <form onSubmit={handleSubmit}>
          <input
            className="input-field"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={40}
            autoFocus
          />
          <button
            className="btn-primary modal-submit"
            type="submit"
            disabled={!name.trim()}
          >
            Join Board
          </button>
        </form>
      </div>
    </div>
  );
}
