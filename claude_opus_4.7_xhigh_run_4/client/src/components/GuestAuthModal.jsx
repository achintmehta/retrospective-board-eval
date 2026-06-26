import { useState } from 'react';

export default function GuestAuthModal({ onSubmit, defaultValue = '' }) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Please enter a display name');
      return;
    }
    if (trimmed.length > 60) {
      setError('Display name must be 60 characters or fewer');
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="guest-modal-title">
      <div className="modal">
        <div className="modal-header">
          <h2 id="guest-modal-title">Join board</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label htmlFor="display-name">Enter a display name to join this board</label>
            <input
              id="display-name"
              className="input"
              autoFocus
              maxLength={60}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError('');
              }}
              placeholder="e.g. Alex"
            />
            {error && (
              <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: 8 }}>{error}</p>
            )}
          </div>
          <div className="modal-footer">
            <button type="submit" className="btn">Join board</button>
          </div>
        </form>
      </div>
    </div>
  );
}
