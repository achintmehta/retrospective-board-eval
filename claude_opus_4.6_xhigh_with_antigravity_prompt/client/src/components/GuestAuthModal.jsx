import { useState } from 'react';

function GuestAuthModal({ onSubmit }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Welcome to the board</h2>
        <p>Enter a display name so your team knows who you are. This is stored only in your browser session.</p>
        <form onSubmit={handleSubmit}>
          <input
            className="input-field"
            type="text"
            placeholder="Your display name..."
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            maxLength={30}
          />
          <div className="modal-actions">
            <button type="submit" className="btn-primary">Join Board</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GuestAuthModal;
