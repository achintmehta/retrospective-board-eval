import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import Card from './Card.jsx';

export default function Column({ column, onAddCard, onAddComment }) {
  const [draft, setDraft] = useState('');

  function submit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onAddCard(column.id, text);
    setDraft('');
  }

  return (
    <section className="column">
      <header className="column-header">
        <h3>{column.title}</h3>
        <span className="muted">{column.cards.length}</span>
      </header>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column-cards ${snapshot.isDraggingOver ? 'over' : ''}`}
          >
            {column.cards.map((card, i) => (
              <Card key={card.id} card={card} index={i} onAddComment={onAddComment} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <form className="add-card-form" onSubmit={submit}>
        <textarea
          placeholder="Add a card…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          maxLength={5000}
          aria-label={`Add card to ${column.title}`}
        />
        <button type="submit" disabled={!draft.trim()}>Add</button>
      </form>
    </section>
  );
}
