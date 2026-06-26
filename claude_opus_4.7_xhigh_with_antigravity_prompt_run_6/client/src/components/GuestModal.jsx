import { useState } from 'react';
import Modal from './Modal.jsx';

export default function GuestModal({ open, onSubmit, initial = '' }) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a display name.');
      return;
    }
    if (trimmed.length > 40) {
      setError('Names must be 40 characters or fewer.');
      return;
    }
    setError('');
    onSubmit(trimmed);
  };

  return (
    <Modal
      open={open}
      onClose={() => {}}
      dismissable={false}
      title="Welcome to the retro"
      subtitle="Pick a display name so teammates know who's adding cards and comments. No password required."
      id="guest-modal"
    >
      <form onSubmit={submit}>
        <label className="label" htmlFor="guest-name">Display name</label>
        <input
          className="input"
          id="guest-name"
          autoFocus
          maxLength={40}
          placeholder="e.g. Ada Lovelace"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {error && <div className="error-text">{error}</div>}
        <div className="modal-actions">
          <button type="submit" className="btn btn-primary" id="guest-modal-submit">
            Join board
          </button>
        </div>
      </form>
    </Modal>
  );
}
