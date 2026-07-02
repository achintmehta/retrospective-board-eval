import { useState } from 'react';
import './AddColumnControl.css';

interface AddColumnControlProps {
  onAdd: (title: string) => void;
  busy: boolean;
}

export function AddColumnControl({ onAdd, busy }: AddColumnControlProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  const submit = () => {
    const clean = title.trim();
    if (!clean) return;
    onAdd(clean);
    setTitle('');
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        className="add-column-empty"
        onClick={() => setOpen(true)}
        aria-label="Add a new column"
      >
        <span className="add-column-plus" aria-hidden>+</span>
        <span className="add-column-label">Add column</span>
      </button>
    );
  }

  return (
    <div className="add-column-open scale-in">
      <input
        autoFocus
        className="input"
        placeholder="Column title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
          if (e.key === 'Escape') {
            setOpen(false);
            setTitle('');
          }
        }}
        maxLength={40}
      />
      <div className="add-column-actions">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setOpen(false);
            setTitle('');
          }}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary btn-sm"
          disabled={!title.trim() || busy}
          onClick={submit}
        >
          {busy ? 'Adding…' : 'Add column'}
        </button>
      </div>
    </div>
  );
}
