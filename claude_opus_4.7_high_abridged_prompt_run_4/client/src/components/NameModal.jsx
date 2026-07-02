import { useEffect, useState } from 'react';

export default function NameModal({ open, onSubmit }) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!open) setValue('');
  }, [open]);

  if (!open) return null;

  function handle(e) {
    e.preventDefault();
    const name = value.trim().slice(0, 60);
    if (!name) return;
    onSubmit(name);
  }

  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <form className="modal" onSubmit={handle}>
        <div className="modal-badge" aria-hidden>◈</div>
        <h2>Join the retro</h2>
        <p className="modal-sub">
          Pick a display name — it will appear next to your cards and comments.
        </p>
        <input
          className="modal-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Your display name"
          autoFocus
          maxLength={60}
        />
        <button className="btn primary block" disabled={!value.trim()}>
          Enter board
          <span className="btn-arrow" aria-hidden>→</span>
        </button>
        <div className="modal-fine">
          No account needed. Your name is stored locally in this browser.
        </div>
      </form>
    </div>
  );
}
