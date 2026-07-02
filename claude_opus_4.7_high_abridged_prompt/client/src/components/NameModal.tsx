import { FormEvent, useState } from 'react';

interface Props {
  onSubmit: (name: string) => void;
}

export default function NameModal({ onSubmit }: Props) {
  const [name, setName] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed.slice(0, 40));
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>Welcome to the retro 👋</h2>
        <p>
          Pick a display name so your teammates know who's dropping cards. This
          stays local to your browser — no account required.
        </p>
        <form className="form-stack" onSubmit={submit}>
          <label className="form-label" htmlFor="display-name">
            Display name
          </label>
          <input
            id="display-name"
            className="input"
            placeholder="e.g. Alex"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoFocus
          />
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
            Join board
          </button>
        </form>
      </div>
    </div>
  );
}
