import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import Card from './Card';

export default function Column({ column, onAddCard, onAddComment }) {
  const [adding, setAdding] = useState(false);
  const [content, setContent] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    onAddCard(column.id, content.trim());
    setContent('');
    setAdding(false);
  };

  return (
    <div className="column">
      <h3 className="column-title">{column.title}</h3>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            className={`card-list${snapshot.isDraggingOver ? ' dragging-over' : ''}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {column.cards.map((card, index) => (
              <Card
                key={card.id}
                card={card}
                index={index}
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
            rows={3}
            placeholder="Card content..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="btn-row">
            <button type="submit">Add Card</button>
            <button type="button" className="btn-cancel" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button className="add-card-btn" onClick={() => setAdding(true)}>
          + Add Card
        </button>
      )}
    </div>
  );
}
