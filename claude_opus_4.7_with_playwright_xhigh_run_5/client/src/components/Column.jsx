import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import CardItem from './CardItem.jsx';

export default function Column({ column, onAddCard, onAddComment }) {
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onAddCard(column.id, t);
    setText('');
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
            className={`column-body ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {column.cards.map((card, idx) => (
              <CardItem
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
      <div className="column-footer">
        {adding ? (
          <form onSubmit={handleSubmit} className="add-card-form">
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Card content…"
              maxLength={500}
              rows={3}
              aria-label="New card content"
            />
            <div className="add-card-actions">
              <button type="submit" disabled={!text.trim()}>Add</button>
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
          <button
            type="button"
            className="add-card-btn"
            onClick={() => setAdding(true)}
          >
            + Add card
          </button>
        )}
      </div>
    </div>
  );
}
