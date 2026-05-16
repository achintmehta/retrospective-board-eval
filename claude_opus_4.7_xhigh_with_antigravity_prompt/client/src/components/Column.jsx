import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import Card from './Card.jsx';

const COLUMN_ACCENTS = [
  'var(--col-0)',
  'var(--col-1)',
  'var(--col-2)',
  'var(--col-3)',
  'var(--col-4)',
  'var(--col-5)',
];

export default function Column({ column, index, onAddCard, onAddComment }) {
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const accent = COLUMN_ACCENTS[index % COLUMN_ACCENTS.length];

  async function submit(e) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onAddCard(column.id, trimmed);
      setDraft('');
      setDraftOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(e);
    if (e.key === 'Escape') {
      setDraftOpen(false);
      setDraft('');
    }
  }

  return (
    <section className="column" style={{ '--col-accent': accent }} id={`column-${column.id}`}>
      <header className="column-head">
        <h3>
          <span className="swatch" aria-hidden="true" />
          <span>{column.title}</span>
        </h3>
        <span className="column-count tabular">{column.cards.length}</span>
      </header>

      <Droppable droppableId={column.id} type="CARD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column-body${snapshot.isDraggingOver ? ' is-dragging-over' : ''}`}
          >
            {column.cards.map((card, idx) => (
              <Card
                key={card.id}
                card={card}
                index={idx}
                onAddComment={onAddComment}
              />
            ))}
            {provided.placeholder}
            {column.cards.length === 0 && !snapshot.isDraggingOver && (
              <p className="muted" style={{ textAlign: 'center', fontSize: '0.8125rem', padding: '12px 0' }}>
                Drag a card here, or add one below.
              </p>
            )}
          </div>
        )}
      </Droppable>

      <footer className="column-foot">
        {!draftOpen ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ width: '100%' }}
            onClick={() => setDraftOpen(true)}
            id={`add-card-trigger-${column.id}`}
          >
            + Add a card
          </button>
        ) : (
          <form className="add-card" onSubmit={submit}>
            <textarea
              autoFocus
              className="textarea"
              placeholder="What happened?"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={2000}
              aria-label={`New card in ${column.title}`}
              id={`new-card-input-${column.id}`}
            />
            <div className="add-card-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => { setDraftOpen(false); setDraft(''); }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!draft.trim() || submitting}
                id={`new-card-submit-${column.id}`}
              >
                {submitting ? 'Adding…' : 'Add card'}
              </button>
            </div>
          </form>
        )}
      </footer>
    </section>
  );
}
