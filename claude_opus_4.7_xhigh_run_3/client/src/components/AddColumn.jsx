import { useState } from 'react';

export default function AddColumn({ onCreate }) {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onCreate(trimmed);
      setTitle('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="add-column" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="New column title…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={80}
        disabled={busy}
      />
      <button className="btn btn-small" type="submit" disabled={!title.trim() || busy}>
        {busy ? 'Adding…' : 'Add column'}
      </button>
    </form>
  );
}
