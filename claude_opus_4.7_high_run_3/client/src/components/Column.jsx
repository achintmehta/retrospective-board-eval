import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import CardItem from './CardItem.jsx';

export default function Column({ column, onAddCard, onAddComment }) {
  const [cardText, setCardText] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = cardText.trim();
    if (!trimmed) return;
    onAddCard(column.id, trimmed);
    setCardText('');
  }

  return (
    <div className="column">
      <h3 className="column-title">{column.title}</h3>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`card-list ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
          >
            {(column.cards || []).map((card, idx) => (
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

      <form className="add-card" onSubmit={handleSubmit}>
        <textarea
          placeholder="Add a card…"
          value={cardText}
          onChange={(e) => setCardText(e.target.value)}
          rows={2}
        />
        <button type="submit" disabled={!cardText.trim()}>
          Add Card
        </button>
      </form>
    </div>
  );
}
