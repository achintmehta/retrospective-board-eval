import { useState } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import Card from './Card.jsx';

export default function Column({ column, onAddCard, onAddComment }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onAddCard(column.id, trimmed);
      setText('');
      setAdding(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="column">
      <header className="column-header">
        <h2>{column.title}</h2>
        <span className="card-count">{column.cards.length}</span>
      </header>

      <Droppable droppableId={column.id} type="card">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`card-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
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
        <form onSubmit={handleAdd} className="add-card-form">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind?"
            maxLength={500}
            rows={2}
            aria-label="New card content"
          />
          <div className="add-card-actions">
            <button type="submit" disabled={!text.trim() || submitting}>
              {submitting ? 'Adding…' : 'Add card'}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setAdding(false);
                setText('');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="add-card-button" onClick={() => setAdding(true)}>
          + Add a card
        </button>
      )}
    </section>
  );
}
