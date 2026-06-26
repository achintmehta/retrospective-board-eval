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
      <header className="column-header">
        <h3>{column.title}</h3>
        <span className="column-count">{column.cards.length}</span>
      </header>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            className={`column-cards ${snapshot.isDraggingOver ? 'column-dragging-over' : ''}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {column.cards.map((card, i) => (
              <Card key={card.id} card={card} index={i} onAddComment={onAddComment} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <div className="column-add">
        {adding ? (
          <form onSubmit={submit} className="add-card-form">
            <textarea
              autoFocus
              placeholder="Card content…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              rows={2}
              aria-label="New card content"
            />
            <div className="add-card-actions">
              <button type="submit" disabled={!text.trim()}>Add</button>
              <button type="button" onClick={() => { setAdding(false); setText(''); }}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="add-card-button" onClick={() => setAdding(true)}>
            + Add card
          </button>
        )}
      </div>
    </div>
  );
}
