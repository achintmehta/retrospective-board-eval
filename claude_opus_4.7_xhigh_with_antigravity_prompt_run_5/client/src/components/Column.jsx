import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import CardItem from './CardItem.jsx';
import { columnAccent } from '../lib/identity';

export default function Column({
  column,
  index,
  cards,
  commentCountByCard,
  onAddCard,
  onOpenCard,
}) {
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: `col-${column.id}`,
    data: { type: 'column', columnId: column.id },
  });

  const submit = async (e) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setSubmitting(true);
    try {
      await onAddCard(column.id, content);
      setDraft('');
      setComposing(false);
    } finally {
      setSubmitting(false);
    }
  };

  const cardIds = cards.map((c) => c.id);

  return (
    <section
      className={'column' + (isOver ? ' drop-active' : '')}
      ref={setNodeRef}
      aria-label={`Column ${column.title}`}
      id={`column-${column.id}`}
    >
      <header className="column-header">
        <div className="column-title">
          <span
            className="accent"
            style={{ background: columnAccent(index) }}
            aria-hidden
          />
          <span>{column.title}</span>
        </div>
        <span className="column-count">{cards.length}</span>
      </header>
      <div className="column-body">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              commentCount={commentCountByCard.get(card.id) || 0}
              onOpen={onOpenCard}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && !composing && (
          <div className="dim" style={{ padding: '8px 4px', fontSize: '0.82rem' }}>
            No cards yet. Drop one in.
          </div>
        )}
      </div>
      <div className="add-card-area">
        {composing ? (
          <form className="add-card-form" onSubmit={submit}>
            <textarea
              autoFocus
              id={`new-card-${column.id}`}
              className="textarea"
              placeholder="What happened?"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
                if (e.key === 'Escape') {
                  setComposing(false);
                  setDraft('');
                }
              }}
              maxLength={2000}
            />
            <div className="actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => { setComposing(false); setDraft(''); }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!draft.trim() || submitting}
              >
                {submitting ? 'Adding…' : 'Add card'}
              </button>
            </div>
            <div className="dim" style={{ fontSize: '0.72rem' }}>
              <span className="kbd">⌘/Ctrl</span> + <span className="kbd">Enter</span> to submit
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="add-card-trigger"
            id={`add-card-${column.id}`}
            onClick={() => setComposing(true)}
          >
            + Add a card
          </button>
        )}
      </div>
    </section>
  );
}
