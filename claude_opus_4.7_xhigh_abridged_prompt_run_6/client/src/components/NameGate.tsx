import { useState, type FormEvent } from 'react';

type Props = {
  onSubmit: (name: string) => void;
  boardTitle?: string;
};

export function NameGate({ onSubmit, boardTitle }: Props) {
  const [name, setName] = useState('');
  const trimmed = name.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= 40;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit(trimmed);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Join the retro</h2>
            <p className="modal-sub">
              {boardTitle
                ? `You're joining "${boardTitle}". Pick a display name so your teammates know who's contributing.`
                : "Pick a display name so your teammates know who's contributing."}
            </p>
          </div>
        </div>

        <div className="field">
          <label htmlFor="display-name" className="field-label">
            Display name
          </label>
          <input
            id="display-name"
            className="input"
            autoFocus
            placeholder="e.g. Priya"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
          />
        </div>

        <div className="modal-actions">
          <button type="submit" className="btn btn-primary" disabled={!valid}>
            Enter board →
          </button>
        </div>
      </form>
    </div>
  );
}
