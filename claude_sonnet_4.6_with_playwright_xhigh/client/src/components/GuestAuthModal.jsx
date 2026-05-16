import { useState } from 'react';

export default function GuestAuthModal({ onSubmit }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '2rem',
        width: 360,
        boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Welcome!</h2>
        <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
          Enter your display name to join the board.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name..."
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1.5px solid #e0e0e0',
              borderRadius: 6,
              fontSize: '1rem',
              marginBottom: '1rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              width: '100%',
              background: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '0.75rem',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            Join Board
          </button>
        </form>
      </div>
    </div>
  );
}
