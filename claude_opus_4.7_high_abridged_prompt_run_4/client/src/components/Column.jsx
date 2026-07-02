import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Card from './Card.jsx';

const ACCENTS = [
  'accent-emerald',
  'accent-rose',
  'accent-violet',
  'accent-amber',
  'accent-sky',
  'accent-fuchsia',
];

export default function Column({ column, index, onAddCard, onOpenComments }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const { setNodeRef, isOver } = useDroppable({
    id: `col:${column.id}`,
    data: { type: 'column', columnId: column.id },
  });

  const accent = ACCENTS[index % ACCENTS.length];

  function submit(e) {
    e?.preventDefault();
    const content = draft.trim();
    if (!content) return;
    onAddCard(column.id, content);
    setDraft('');
    setAdding(false);
  }

  return (
    <section className={`column ${accent} ${isOver ? 'is-over' : ''}`} ref={setNodeRef}>
      <header className="column-head">
        <div className="column-title-wrap">
          <span className="column-dot" aria-hidden />
          <h3 className="column-title">{column.title}</h3>
        </div>
        <span className="column-count">{column.cards.length}</span>
      </header>

      <div className="column-body">
        <SortableContext
          items={column.cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              onOpenComments={onOpenComments}
            />
          ))}
        </SortableContext>

        {column.cards.length === 0 && !adding && (
          <div className="column-empty">Drop cards here or add a new one.</div>
        )}
      </div>

      <footer className="column-foot">
        {adding ? (
          <form className="add-card-form" onSubmit={submit}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="What's on your mind?"
              maxLength={2000}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
                if (e.key === 'Escape') {
                  setAdding(false);
                  setDraft('');
                }
              }}
            />
            <div className="add-card-actions">
              <button
                type="button"
                className="btn ghost small"
                onClick={() => {
                  setAdding(false);
                  setDraft('');
                }}
              >
                Cancel
              </button>
              <button className="btn primary small" disabled={!draft.trim()}>
                Add card
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="add-card-btn"
            onClick={() => setAdding(true)}
          >
            <span className="plus" aria-hidden>+</span> Add card
          </button>
        )}
      </footer>
    </section>
  );
}
