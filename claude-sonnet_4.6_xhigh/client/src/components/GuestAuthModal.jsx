import { useState } from 'react';

export default function GuestAuthModal({ onLogin }) {
  const [name, setName] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onLogin(name.trim());
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Enter your display name</h2>
        <form onSubmit={submit}>
          <input
            autoFocus
            type="text"
            placeholder="Your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit">Join Board</button>
        </form>
      </div>
    </div>
  );
}
