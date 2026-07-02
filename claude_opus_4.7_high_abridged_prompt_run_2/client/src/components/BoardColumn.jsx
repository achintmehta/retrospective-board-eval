import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import CardView from './CardView.jsx';
import './BoardColumn.css';

const COLOR_MAP = {
  success: { gradient: 'linear-gradient(135deg, #34d399 0%, #3ec1ff 100%)', dot: '#34d399' },
  warning: { gradient: 'linear-gradient(135deg, #fbbf24 0%, #ff5cad 100%)', dot: '#fbbf24' },
  danger: { gradient: 'linear-gradient(135deg, #f87171 0%, #ff5cad 100%)', dot: '#f87171' },
  accent: { gradient: 'linear-gradient(135deg, #7c5cff 0%, #3ec1ff 100%)', dot: '#7c5cff' },
  info: { gradient: 'linear-gradient(135deg, #3ec1ff 0%, #7c5cff 100%)', dot: '#3ec1ff' },
};

export default function BoardColumn({ column, onAddCard, onOpenComments }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column' },
  });

  const color = COLOR_MAP[column.color] || COLOR_MAP.accent;

  const submit = (e) => {
    e.preventDefault();
    const val = draft.trim();
    if (!val) return;
    onAddCard(val);
    setDraft('');
    setAdding(false);
  };

  return (
    <section
      className={`column ${isOver ? 'is-over' : ''}`}
      ref={setNodeRef}
    >
      <header className="column-header">
        <div className="column-title-wrap">
          <span className="column-dot" style={{ background: color.dot, boxShadow: `0 0 12px ${color.dot}` }} />
          <h3 className="column-title">{column.title}</h3>
        </div>
        <div className="column-actions">
          <span className="column-count">{column.cards.length}</span>
        </div>
      </header>
      <div className="column-accent" style={{ background: color.gradient }} />

      <div className="column-cards">
        {column.cards.map((card) => (
          <CardView
            key={card.id}
            card={card}
            onOpenComments={() => onOpenComments(card.id)}
          />
        ))}
        {column.cards.length === 0 && !adding && (
          <div className="column-empty">No cards yet</div>
        )}
      </div>

      {adding ? (
        <form className="column-add-form" onSubmit={submit}>
          <textarea
            autoFocus
            className="textarea"
            placeholder="What's on your mind?"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
              if (e.key === 'Escape') {
                setAdding(false);
                setDraft('');
              }
            }}
            maxLength={2000}
          />
          <div className="column-add-actions">
            <button type="button" className="btn btn-ghost" onClick={() => { setAdding(false); setDraft(''); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!draft.trim()}>
              Add card
            </button>
          </div>
          <p className="column-add-hint">⌘/Ctrl + Enter to submit</p>
        </form>
      ) : (
        <button className="column-add-btn" onClick={() => setAdding(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Add card
        </button>
      )}
    </section>
  );
}
