import { useState } from 'react';

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease',
  },
  modal: {
    background: 'var(--bg-modal)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    padding: '40px',
    width: '100%',
    maxWidth: 400,
    boxShadow: 'var(--shadow-lg)',
    animation: 'slideUp 0.3s ease',
  },
  title: {
    fontSize: 22,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    marginBottom: 28,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: 15,
    transition: 'border-color var(--transition), box-shadow var(--transition)',
    marginBottom: 20,
  },
  btn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #6c5ce7, #5a4bd1)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform var(--transition), box-shadow var(--transition)',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6c5ce7, #e84393)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    fontSize: 28,
    color: '#fff',
  },
};

export default function GuestAuthModal({ onJoin }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) onJoin(name.trim());
  };

  return (
    <div style={styles.overlay}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={styles.modal}>
        <div style={styles.avatar}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h2 style={styles.title}>Join this retro</h2>
        <p style={styles.description}>Enter your display name to start collaborating</p>
        <form onSubmit={handleSubmit}>
          <input
            style={styles.input}
            type="text"
            placeholder="Your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--border-focus)';
              e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button
            type="submit"
            style={styles.btn}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 16px rgba(108, 92, 231, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            Join Board
          </button>
        </form>
      </div>
    </div>
  );
}
