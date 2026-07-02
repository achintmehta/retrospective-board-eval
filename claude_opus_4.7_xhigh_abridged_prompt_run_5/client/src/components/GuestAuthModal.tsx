import { useState } from 'react';
import { Modal } from './Modal';

export function GuestAuthModal({
  onSubmit,
  boardTitle,
}: {
  onSubmit: (displayName: string) => void;
  boardTitle: string;
}) {
  const [name, setName] = useState('');

  return (
    <Modal closable={false}>
      <h2>Join the retro</h2>
      <p>
        You’re about to join <b>{boardTitle}</b>. Pick a display name so teammates know who added what.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = name.trim();
          if (trimmed) onSubmit(trimmed);
        }}
      >
        <div className="field">
          <label htmlFor="display-name">Display name</label>
          <input
            id="display-name"
            className="input"
            placeholder="e.g. Alex"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            autoFocus
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-primary" disabled={!name.trim()}>
            Join board
          </button>
        </div>
      </form>
    </Modal>
  );
}
