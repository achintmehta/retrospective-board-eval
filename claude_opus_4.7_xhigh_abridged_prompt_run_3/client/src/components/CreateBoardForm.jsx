import { useState } from 'react';

const DEFAULT_COLUMNS = ['What went well', 'What needs improvement', 'Action items'];

export default function CreateBoardForm({ onSubmit, loading }) {
  const [title, setTitle] = useState('');
  const [columns, setColumns] = useState([...DEFAULT_COLUMNS]);

  function updateColumn(index, value) {
    setColumns((prev) => prev.map((c, i) => (i === index ? value : c)));
  }

  function addColumn() {
    setColumns((prev) => [...prev, '']);
  }

  function removeColumn(index) {
    setColumns((prev) => prev.filter((_, i) => i !== index));
  }

  function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    const cleaned = columns.map((c) => c.trim()).filter(Boolean);
    onSubmit(title.trim(), cleaned.length ? cleaned : undefined);
  }

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        <span className="field__label">Board title</span>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sprint 42 retrospective"
          maxLength={120}
          required
        />
      </label>

      <div className="field">
        <div className="field__label-row">
          <span className="field__label">Columns</span>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={addColumn}
            disabled={columns.length >= 8}
          >
            + Add column
          </button>
        </div>
        <div className="col-list">
          {columns.map((col, i) => (
            <div key={i} className="col-list__row">
              <input
                className="input"
                value={col}
                onChange={(e) => updateColumn(i, e.target.value)}
                placeholder={`Column ${i + 1}`}
                maxLength={60}
              />
              {columns.length > 1 && (
                <button
                  type="button"
                  className="btn btn--ghost btn--icon"
                  aria-label={`Remove column ${i + 1}`}
                  onClick={() => removeColumn(i)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        className="btn btn--primary btn--lg"
        type="submit"
        disabled={loading || !title.trim()}
      >
        {loading ? 'Creating…' : 'Create board →'}
      </button>
    </form>
  );
}
