import { useState } from 'react';

const PRESET_COLORS = [
  '#8b5cf6',
  '#22c55e',
  '#f59e0b',
  '#06b6d4',
  '#ec4899',
  '#f97316',
];

export default function AddColumnButton({ onCreate }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  function submit(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onCreate(t, color);
    setTitle('');
    setColor(PRESET_COLORS[0]);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        className="add-column-trigger"
        onClick={() => setOpen(true)}
      >
        <span className="plus">+</span>
        Add column
      </button>
    );
  }

  return (
    <form className="add-column-form" onSubmit={submit}>
      <input
        autoFocus
        type="text"
        className="modal-input"
        placeholder="Column title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={80}
      />
      <div className="color-picker">
        {PRESET_COLORS.map((c) => (
          <button
            type="button"
            key={c}
            className={'color-swatch' + (c === color ? ' is-active' : '')}
            style={{ background: c }}
            onClick={() => setColor(c)}
            aria-label={`Use color ${c}`}
          />
        ))}
      </div>
      <div className="add-card-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setOpen(false);
            setTitle('');
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={!title.trim()}
        >
          Create column
        </button>
      </div>
    </form>
  );
}
