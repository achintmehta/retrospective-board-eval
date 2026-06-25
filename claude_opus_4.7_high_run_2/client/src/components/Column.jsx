import { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import Card from './Card.jsx';

export default function Column({ column, onAddCard, onAddComment }) {
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
    <div className="column">
      <header className="column-header">
        <h3>{column.title}</h3>
        <span className="column-count">{column.cards.length}</span>
      </header>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            className={`column-cards ${snapshot.isDraggingOver ? 'is-over' : ''}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {column.cards.map((card, index) => (
              <Draggable draggableId={card.id} index={index} key={card.id}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className={`card-wrap ${dragSnapshot.isDragging ? 'dragging' : ''}`}
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
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What do you want to share?"
            maxLength={2000}
            rows={3}
          />
          <div className="form-actions">
            <button type="submit" disabled={!draft.trim()}>Add</button>
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
          + Add card
        </button>
      )}
    </div>
  );
}
