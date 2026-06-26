import { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import Card from './Card.jsx';

export default function Column({
  column,
  cards,
  accent,
  commentsByCard,
  onAddCard,
  onOpenCard,
  disabled,
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  function submit(e) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    onAddCard(content);
    setDraft('');
    setAdding(false);
  }

  function cancel() {
    setAdding(false);
    setDraft('');
  }

  return (
    <section
      className="column"
      id={`column-${column.id}`}
      style={{ '--col-accent': accent.color, '--col-gradient': accent.gradient }}
    >
      <header className="column-header">
        <div className="column-header-bar" aria-hidden="true" />
        <h2 className="column-title">{column.title}</h2>
        <span className="column-count" aria-label={`${cards.length} cards`}>
          {cards.length}
        </span>
      </header>

      <Droppable droppableId={column.id} type="CARD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column-cards${snapshot.isDraggingOver ? ' is-drag-over' : ''}`}
          >
            {cards.length === 0 && !snapshot.isDraggingOver && (
              <div className="column-empty">Drop a thought here.</div>
            )}
            {cards.map((card, index) => (
              <Draggable
                key={card.id}
                draggableId={card.id}
                index={index}
                isDragDisabled={disabled}
              >
                {(dragProvided, dragSnapshot) => (
                  <Card
                    provided={dragProvided}
                    snapshot={dragSnapshot}
                    card={card}
                    commentCount={(commentsByCard.get(card.id) || []).length}
                    onOpen={() => onOpenCard(card.id)}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <div className="column-footer">
        {adding ? (
          <form className="card-composer" onSubmit={submit}>
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="What happened?"
              rows={3}
              maxLength={500}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  submit(e);
                } else if (e.key === 'Escape') {
                  cancel();
                }
              }}
            />
            <div className="card-composer-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={cancel}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={!draft.trim()}>
                Add card
              </button>
            </div>
            <div className="card-composer-hint">⌘ + Enter to save</div>
          </form>
        ) : (
          <button
            type="button"
            className="add-card-btn"
            id={`add-card-${column.id}`}
            onClick={() => setAdding(true)}
            disabled={disabled}
          >
            <span aria-hidden="true">+</span> Add a card
          </button>
        )}
      </div>
    </section>
  );
}
