import { useState } from 'react';

export default function GuestModal({ onSubmit }) {
  const [name, setName] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)', zIndex: 1000,
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'var(--surface, #fff)', padding: 32, borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)', width: 360,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}
      >
        <h2 style={{ fontSize: 20, margin: 0 }}>Join Board</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Enter your display name to participate.
        </p>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name..."
          autoFocus
          style={{ width: '100%' }}
        />
        <button
          type="submit"
          style={{
            background: 'var(--primary)', color: '#fff',
            padding: '10px 20px', fontSize: 15,
          }}
        >
          Join
        </button>
      </form>
    </div>
  );
}
