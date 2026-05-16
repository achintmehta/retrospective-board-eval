import { useState } from 'react';
import './GuestModal.css';

function GuestModal({ onJoin }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(name.trim());
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content guest-modal">
        <h2>Join Retrospective</h2>
        <p>Enter your display name to get started</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button type="submit">Join Board</button>
        </form>
      </div>
    </div>
  );
}

export default GuestModal;
