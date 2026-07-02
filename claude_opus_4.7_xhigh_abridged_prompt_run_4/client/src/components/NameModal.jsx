import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function NameModal({ onSubmit }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a name');
      return;
    }
    if (trimmed.length > 40) {
      setError('Name must be 40 characters or fewer');
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <div className="modal-overlay">
      <form className="modal name-modal" onSubmit={submit}>
        <div className="modal-glow" aria-hidden="true" />
        <h2>Join the retro</h2>
        <p className="modal-sub">
          Enter a display name so teammates know who added a card. This is stored
          locally on your device — no account required.
        </p>
        <input
          autoFocus
          className="text-input"
          placeholder="Your name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError('');
          }}
          maxLength={40}
          aria-label="Display name"
        />
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <Link to="/" className="btn btn-ghost">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
            Enter board
            <span className="btn-arrow">→</span>
          </button>
        </div>
      </form>
    </div>
  );
}
