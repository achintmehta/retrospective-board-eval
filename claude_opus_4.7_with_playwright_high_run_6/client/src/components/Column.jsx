import { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import Card from './Card.jsx';

export default function Column({ column, onAddCard, onAddComment }) {
  const [text, setText] = useState('');

  function submit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddCard(column.id, trimmed);
    setText('');
  }

  return (
    <div className="column">
      <div className="column-header">
        <h3>{column.title}</h3>
        <span className="card-count">{column.cards.length}</span>
      </div>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column-cards ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
          >
            {column.cards.map((card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className={dragSnapshot.isDragging ? 'dragging' : ''}
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
      <form onSubmit={submit} className="add-card-form">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a card…"
          rows={2}
          aria-label="New card content"
        />
        <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
          Add card
        </button>
      </form>
    </div>
  );
}
