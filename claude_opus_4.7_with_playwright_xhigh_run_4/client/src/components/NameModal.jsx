import { useState } from 'react';

export default function NameModal({ initialName = '', onSubmit }) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a display name.');
      return;
    }
    if (trimmed.length > 80) {
      setError('Display name must be 80 characters or fewer.');
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="name-modal-title">
      <form className="modal" onSubmit={handleSubmit}>
        <h2 id="name-modal-title">Join this retro</h2>
        <p className="muted">
          Tell your teammates who you are. We will tag your cards and comments
          with this name.
        </p>
        <label htmlFor="display-name">Display name</label>
        <input
          id="display-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError('');
          }}
          placeholder="e.g. Sam from Platform"
          autoFocus
          maxLength={80}
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={!name.trim()}>
          Join board
        </button>
      </form>
    </div>
  );
}
