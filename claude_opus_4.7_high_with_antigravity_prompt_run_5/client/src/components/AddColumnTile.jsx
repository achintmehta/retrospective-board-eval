import { useState } from 'react';

const COLORS = ['emerald', 'amber', 'violet', 'cyan', 'pink'];

export default function AddColumnTile({ onAdd }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('violet');

  function submit(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onAdd(t, color);
    setTitle('');
    setColor('violet');
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        className="add-column-tile"
        onClick={() => setEditing(true)}
        id="add-column-tile"
      >
        <span className="plus" aria-hidden="true">+</span>
        <span>Add column</span>
      </button>
    );
  }

  return (
    <form className="add-column-tile" onSubmit={submit} style={{ alignItems: 'stretch' }}>
      <div className="add-column-form">
        <input
          autoFocus
          type="text"
          placeholder="Column name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={60}
          id="new-column-title"
        />
        <select
          value={color}
          onChange={(e) => setColor(e.target.value)}
          id="new-column-color"
        >
          {COLORS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ flex: 1 }}
            onClick={() => { setEditing(false); setTitle(''); }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            style={{ flex: 1 }}
            disabled={!title.trim()}
            id="new-column-submit"
          >
            Create
          </button>
        </div>
      </div>
    </form>
  );
}
