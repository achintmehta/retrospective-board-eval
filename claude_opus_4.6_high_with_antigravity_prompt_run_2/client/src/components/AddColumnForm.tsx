import { useState, FormEvent } from 'react';

interface AddColumnFormProps {
  onAdd: (title: string) => void;
}

export default function AddColumnForm({ onAdd }: AddColumnFormProps) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim());
    setTitle('');
    setAdding(false);
  };

  if (!adding) {
    return (
      <button
        className="add-column-btn"
        onClick={() => setAdding(true)}
        id="add-column-btn"
      >
        + Add Column
      </button>
    );
  }

  return (
    <form className="add-column-form" onSubmit={handleSubmit}>
      <input
        className="input"
        type="text"
        placeholder="Column title..."
        value={title}
        onChange={e => setTitle(e.target.value)}
        autoFocus
        id="column-title-input"
      />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          onClick={() => { setAdding(false); setTitle(''); }}
        >
          Cancel
        </button>
        <button className="btn btn-primary btn-sm" type="submit" id="submit-column-btn">
          Add
        </button>
      </div>
    </form>
  );
}
