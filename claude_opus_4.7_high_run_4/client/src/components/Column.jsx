import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import Card from './Card.jsx';

export default function Column({ column, onAddCard, onOpenCard }) {
  const [content, setContent] = useState('');

  function handleAdd(e) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    onAddCard(column.id, trimmed);
    setContent('');
  }

  return (
    <div className="column">
      <div className="column-header">
        <h3>{column.title}</h3>
        <span className="count">{column.cards.length}</span>
      </div>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column-cards${snapshot.isDraggingOver ? ' drag-over' : ''}`}
          >
            {column.cards.map((card, idx) => (
              <Card
                key={card.id}
                card={card}
                index={idx}
                onOpen={onOpenCard}
              />
            ))}
            {provided.placeholder}
            {column.cards.length === 0 && !snapshot.isDraggingOver && (
              <p className="empty" style={{ margin: '0.25rem 0 0' }}>
                Drop or add a card…
              </p>
            )}
          </div>
        )}
      </Droppable>
      <form className="column-add" onSubmit={handleAdd}>
        <textarea
          placeholder="Add a card…"
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAdd(e);
            }
          }}
        />
        <button type="submit" className="primary" disabled={!content.trim()}>
          Add card
        </button>
      </form>
    </div>
  );
}
