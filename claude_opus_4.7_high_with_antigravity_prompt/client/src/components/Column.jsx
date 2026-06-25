import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Card from './Card.jsx';

const COLUMN_ACCENTS = [
  'linear-gradient(135deg, #34d399, #22d3ee)',
  'linear-gradient(135deg, #f472b6, #f97316)',
  'linear-gradient(135deg, #8b5cf6, #ec4899)',
  'linear-gradient(135deg, #fbbf24, #f87171)',
  'linear-gradient(135deg, #22d3ee, #6366f1)',
  'linear-gradient(135deg, #a3e635, #14b8a6)'
];

function accentFor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % COLUMN_ACCENTS.length;
  return COLUMN_ACCENTS[idx];
}

export default function Column({ column, cards, commentsByCard, onAddCard, onAddComment }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col:${column.id}`,
    data: { type: 'column', columnId: column.id }
  });

  const [composing, setComposing] = useState(false);
  const [text, setText] = useState('');

  function submit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddCard(column.id, trimmed);
    setText('');
    setComposing(false);
  }

  return (
    <section
      ref={setNodeRef}
      className={`column ${isOver ? 'column--drop-target' : ''}`}
    >
      <header className="column-header">
        <div className="column-title-wrap">
          <span className="column-accent" style={{ background: accentFor(column.id) }} />
          <h2 className="column-title">{column.title}</h2>
        </div>
        <span className="column-count">{cards.length}</span>
      </header>
      <div className="column-body">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              comments={commentsByCard[card.id] || []}
              onAddComment={onAddComment}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && !composing && (
          <div style={{ color: 'var(--text-3)', fontSize: '0.82rem', textAlign: 'center', padding: '12px 4px' }}>
            Nothing here yet.
          </div>
        )}
      </div>
      <footer className="column-footer">
        {composing ? (
          <form className="add-card-form" onSubmit={submit}>
            <textarea
              className="textarea"
              placeholder="What went well / could be better / next…"
              value={text}
              autoFocus
              maxLength={2000}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setComposing(false); setText(''); }
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
              }}
            />
            <div className="row">
              <button type="submit" className="btn btn-primary" disabled={!text.trim()}>Add card</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setComposing(false); setText(''); }}>Cancel</button>
            </div>
          </form>
        ) : (
          <button type="button" className="add-card-toggle" onClick={() => setComposing(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add a card
          </button>
        )}
      </footer>
    </section>
  );
}
