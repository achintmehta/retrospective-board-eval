import { useState } from 'react';

const styles = {
  wrapper: {
    minWidth: 300,
    flex: '0 0 300px',
  },
  addBtn: {
    width: '100%',
    padding: '16px',
    background: 'transparent',
    border: '2px dashed var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  form: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  input: {
    padding: '12px 14px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    outline: 'none',
  },
  actions: {
    display: 'flex',
    gap: 8,
  },
  submitBtn: {
    padding: '8px 18px',
    background: 'var(--gradient-accent)',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.82rem',
    borderRadius: 'var(--radius-xs)',
    border: 'none',
  },
  cancelBtn: {
    padding: '8px 14px',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontWeight: 500,
    fontSize: '0.82rem',
    borderRadius: 'var(--radius-xs)',
    border: '1px solid var(--border)',
  },
};

export default function AddColumnForm({ onAdd }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim());
    setTitle('');
    setAdding(false);
  };

  if (!adding) {
    return (
      <div style={styles.wrapper}>
        <button
          style={styles.addBtn}
          onClick={() => setAdding(true)}
          onMouseEnter={(e) => {
            e.target.style.borderColor = 'var(--text-muted)';
            e.target.style.color = 'var(--text-secondary)';
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = 'var(--border)';
            e.target.style.color = 'var(--text-muted)';
          }}
        >
          + Add Column
        </button>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <form style={styles.form} onSubmit={handleSubmit}>
        <input
          style={styles.input}
          type="text"
          placeholder="Column title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <div style={styles.actions}>
          <button type="submit" style={styles.submitBtn}>Add</button>
          <button type="button" style={styles.cancelBtn} onClick={() => { setAdding(false); setTitle(''); }}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
