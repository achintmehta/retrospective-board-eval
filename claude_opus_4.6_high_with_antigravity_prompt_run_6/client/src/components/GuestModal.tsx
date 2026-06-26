import { useState } from 'react';

interface GuestModalProps {
  onSubmit: (name: string) => void;
}

export function GuestModal({ onSubmit }: GuestModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Welcome!</h2>
        <p>Enter your display name to join this retrospective session.</p>
        <form onSubmit={handleSubmit}>
          <input
            id="guest-name-input"
            type="text"
            placeholder="Your display name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            maxLength={30}
          />
          <button id="guest-submit-btn" type="submit" className="btn-primary">
            Join Board
          </button>
        </form>
      </div>
    </div>
  );
}
