import { useState } from 'react';
import './AddCardForm.css';

export default function AddCardForm({ columnId, onAdd }) {
  const [content, setContent] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    onAdd(columnId, content.trim());
    setContent('');
    setExpanded(false);
  };

  if (!expanded) {
    return (
      <button
        className="add-card-trigger"
        onClick={() => setExpanded(true)}
        id={`add-card-trigger-${columnId}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add a card
      </button>
    );
  }

  return (
    <form className="add-card-form animate-fade-in" onSubmit={handleSubmit}>
      <textarea
        className="input-field add-card-textarea"
        placeholder="Type your thought..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        autoFocus
        rows={3}
        id={`add-card-input-${columnId}`}
      />
      <div className="add-card-actions">
        <button type="submit" className="btn-primary" id={`submit-card-${columnId}`}>Add</button>
        <button type="button" className="btn-secondary" onClick={() => { setExpanded(false); setContent(''); }}>Cancel</button>
      </div>
    </form>
  );
}
