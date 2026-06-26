import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import Card from './Card.jsx';

export default function Column({ column, onAddCard, onAddComment }) {
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);

  function submit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddCard(column.id, trimmed);
    setText('');
    setAdding(false);
  }

  return (
    <div className="column">
      <div className="column-header">
        <h3>{column.title}</h3>
        <span className="muted small">{column.cards.length}</span>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column-body ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
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
          </div>
        )}
      </Droppable>

      {adding ? (
        <form onSubmit={submit} className="add-card-form">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            aria-label="Card content"
          />
          <div className="row">
            <button type="submit" disabled={!text.trim()}>
              Add card
            </button>
            <button
              type="button"
              className="link-like"
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
