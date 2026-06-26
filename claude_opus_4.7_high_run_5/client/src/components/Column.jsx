import { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import Card from './Card.jsx';

export default function Column({ column, onAddCard, onAddComment }) {
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);

  function submit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onAddCard(column.id, text);
    setDraft('');
    setAdding(false);
  }

  return (
    <div className="column">
      <header className="column-header">
        <h3>{column.title}</h3>
        <span className="count">{column.cards.length}</span>
      </header>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column-cards ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
          >
            {column.cards.map((card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(p, snap) => (
                  <div
                    ref={p.innerRef}
                    {...p.draggableProps}
                    {...p.dragHandleProps}
                    className={`card-wrap ${snap.isDragging ? 'dragging' : ''}`}
                  >
                    <Card card={card} onAddComment={onAddComment} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {adding ? (
        <form onSubmit={submit} className="add-card-form">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What happened?"
            maxLength={2000}
            autoFocus
            rows={3}
            aria-label="New card content"
          />
          <div className="row">
            <button type="submit" disabled={!draft.trim()}>
              Add
            </button>
            <button
              type="button"
              className="link"
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
          + Add card
        </button>
      )}
    </div>
  );
}
