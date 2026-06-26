import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import CardItem from './CardItem.jsx';

export default function ColumnView({
  column,
  cards,
  commentsByCard,
  onAddCard,
  onAddComment,
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  function submit(e) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAddCard(column.id, trimmed);
    setDraft('');
    setAdding(false);
  }

  return (
    <section className="column" aria-label={`Column: ${column.title}`}>
      <header className="column-header">
        <h3>{column.title}</h3>
        <span className="column-count">{cards.length}</span>
      </header>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            className={`column-body${snapshot.isDraggingOver ? ' is-over' : ''}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {cards.map((card, i) => (
              <CardItem
                key={card.id}
                card={card}
                index={i}
                comments={commentsByCard.get(card.id) ?? []}
                onAddComment={onAddComment}
              />
            ))}
            {provided.placeholder}
            {cards.length === 0 && !adding && (
              <p className="column-empty muted small">No cards yet.</p>
            )}
          </div>
        )}
      </Droppable>
      <div className="column-footer">
        {adding ? (
          <form className="add-card-form" onSubmit={submit}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="What stood out?"
              rows={3}
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
              <button type="submit" disabled={!draft.trim()}>
                Add card
              </button>
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setAdding(false);
                  setDraft('');
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="add-card-btn"
            onClick={() => setAdding(true)}
          >
            + Add a card
          </button>
        )}
      </div>
    </section>
  );
}
