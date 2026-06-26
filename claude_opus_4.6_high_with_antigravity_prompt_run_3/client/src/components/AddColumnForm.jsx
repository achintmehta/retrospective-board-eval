import React, { useState } from 'react';
import './AddColumnForm.css';

export default function AddColumnForm({ boardId, onColumnAdded }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const res = await fetch(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() })
    });
    const column = await res.json();
    onColumnAdded(column);
    setTitle('');
    setAdding(false);
  };

  if (!adding) {
    return (
      <button className="add-column-btn" onClick={() => setAdding(true)}>
        <span className="add-column-icon">+</span>
        Add Column
      </button>
    );
  }

  return (
    <form className="add-column-form glass-card animate-fade-in" onSubmit={handleSubmit}>
      <input
        className="input-field"
        type="text"
        placeholder='e.g. "Went Well"'
        value={title}
        onChange={e => setTitle(e.target.value)}
        autoFocus
        maxLength={50}
      />
      <div className="add-column-actions">
        <button className="btn-primary" type="submit" disabled={!title.trim()}>Add</button>
        <button className="btn-secondary" type="button" onClick={() => { setAdding(false); setTitle(''); }}>Cancel</button>
      </div>
    </form>
  );
}
