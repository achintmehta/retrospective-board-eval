import { useState } from 'react';
import './GuestAuthModal.css';

function GuestAuthModal({ onSubmit }) {
  const [name, setName] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  }

  return (
    <div className="auth-overlay">
      <div className="auth-modal">
        <h2>Join This Board</h2>
        <p>Enter a display name to start collaborating.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your display name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button type="submit">Join</button>
        </form>
      </div>
    </div>
  );
}

export default GuestAuthModal;
