import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import Card from './Card.jsx';

export default function Column({ column, cards, commentsByCard, onAddCard, onAddComment }) {
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setAdding(true);
    onAddCard(column.id, trimmed, () => {
      setText('');
      setAdding(false);
    });
  }

  return (
    <section className="column">
      <header className="column-header">
        <h3>{column.title}</h3>
        <span className="badge">{cards.length}</span>
      </header>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={'column-drop' + (snapshot.isDraggingOver ? ' over' : '')}
          >
            {cards.map((card, idx) => (
              <Card
                key={card.id}
                card={card}
                index={idx}
                comments={commentsByCard.get(card.id) ?? []}
                onAddComment={onAddComment}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <form className="column-add" onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a card..."
          maxLength={500}
          rows={2}
          disabled={adding}
        />
        <button type="submit" disabled={adding || !text.trim()}>
          {adding ? 'Adding...' : 'Add card'}
        </button>
      </form>
    </section>
  );
}
