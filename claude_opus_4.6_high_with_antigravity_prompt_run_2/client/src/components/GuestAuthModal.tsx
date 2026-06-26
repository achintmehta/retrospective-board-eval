import { useState, FormEvent } from 'react';

interface GuestAuthModalProps {
  onSubmit: (name: string) => void;
}

export default function GuestAuthModal({ onSubmit }: GuestAuthModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim());
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Welcome!</h2>
        <p>Enter your display name to join this retrospective board.</p>
        <form className="modal-form" onSubmit={handleSubmit}>
          <input
            className="input"
            type="text"
            placeholder="Your display name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            id="guest-name-input"
          />
          <button className="btn btn-primary" type="submit" id="join-board-btn">
            Join Board
          </button>
        </form>
      </div>
    </div>
  );
}
