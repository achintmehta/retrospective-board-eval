import { useState, useEffect, useRef } from 'react';
import './AddColumnModal.css';

const COLORS = [
  { key: 'accent', label: 'Violet', preview: 'linear-gradient(135deg, #7c5cff, #3ec1ff)' },
  { key: 'success', label: 'Green', preview: 'linear-gradient(135deg, #34d399, #3ec1ff)' },
  { key: 'warning', label: 'Amber', preview: 'linear-gradient(135deg, #fbbf24, #ff5cad)' },
  { key: 'danger', label: 'Rose', preview: 'linear-gradient(135deg, #f87171, #ff5cad)' },
  { key: 'info', label: 'Sky', preview: 'linear-gradient(135deg, #3ec1ff, #7c5cff)' },
];

export default function AddColumnModal({ onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('accent');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const h = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onSubmit(t, color);
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div
        className="modal glass animate-pop-in add-column-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <h2 className="modal-title">New column</h2>
          <p className="modal-subtitle">Give your new column a name and pick an accent color.</p>
        </div>

        <form onSubmit={submit} className="modal-form">
          <label className="modal-label">Column title</label>
          <input
            ref={inputRef}
            className="input"
            placeholder="e.g. Action items"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
          />

          <label className="modal-label" style={{ marginTop: '0.85rem' }}>
            Accent
          </label>
          <div className="add-column-colors">
            {COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`add-column-swatch ${color === c.key ? 'is-active' : ''}`}
                style={{ background: c.preview }}
                title={c.label}
                onClick={() => setColor(c.key)}
                aria-pressed={color === c.key}
              />
            ))}
          </div>

          <div className="add-column-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
              Add column
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
