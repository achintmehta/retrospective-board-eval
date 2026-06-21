import { useState, useEffect } from 'react';

interface Props {
  onSubmit: (name: string) => void;
  boardTitle: string;
}

export default function AuthModal({ onSubmit, boardTitle }: Props) {
  const [name, setName] = useState('');

  useEffect(() => {
    document.title = `Join ${boardTitle} — RetroBoard`;
  }, [boardTitle]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div className="modal">
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem',
          }}>
            🙋
          </div>
          <h2 id="auth-modal-title">Welcome to the retro!</h2>
          <p>Enter your display name to join <strong>{boardTitle}</strong>. No account needed.</p>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <input
            id="display-name-input"
            className="input"
            type="text"
            placeholder="Your name (e.g. Alex)"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={50}
            autoFocus
            required
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!name.trim()}
            id="join-board-btn"
          >
            Join Board →
          </button>
        </form>
      </div>
    </div>
  );
}
