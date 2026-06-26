import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import Card from './Card.jsx';

export default function Column({ column, onAddCard, onOpenComments }) {
  const [content, setContent] = useState('');
  const [adding, setAdding] = useState(false);

  async function handleAdd(event) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    try {
      await onAddCard(column.id, trimmed);
      setContent('');
    } finally {
      setAdding(false);
    }
  }

  return (
    <section className="column">
      <header className="column-header">
        <span>{column.title}</span>
        <span className="count">{column.cards.length}</span>
      </header>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column-cards${snapshot.isDraggingOver ? ' dragging-over' : ''}`}
          >
            {column.cards.map((card, index) => (
              <Card
                key={card.id}
                card={card}
                index={index}
                onOpenComments={onOpenComments}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <form className="add-card" onSubmit={handleAdd}>
        <textarea
          placeholder="Add a card…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={2000}
          rows={2}
          disabled={adding}
        />
        <div className="add-card-buttons">
          <button
            className="btn btn-small"
            type="submit"
            disabled={!content.trim() || adding}
          >
            {adding ? 'Adding…' : 'Add card'}
          </button>
        </div>
      </form>
    </section>
  );
}
