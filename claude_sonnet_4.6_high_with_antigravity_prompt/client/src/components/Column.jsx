import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import Card from './Card';

export default function Column({ column, onAddCard, onCardClick }) {
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!content.trim() || adding) return;
    setAdding(true);
    await onAddCard(column.id, content.trim());
    setContent('');
    setShowForm(false);
    setAdding(false);
  };

  return (
    <div className="column-wrapper">
      <div className="column">
        <div className="column-header">
          <span className="column-title">{column.title}</span>
          <span className="column-count">{column.cards.length}</span>
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
                  onClick={() => onCardClick(card)}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        <div className="column-add-card">
          {showForm ? (
            <form className="add-card-form" onSubmit={handleAdd}>
              <textarea
                autoFocus
                placeholder="Card content…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(e); }
                  if (e.key === 'Escape') { setShowForm(false); setContent(''); }
                }}
                id={`add-card-textarea-${column.id}`}
              />
              <div className="add-card-form-actions">
                <button type="submit" className="btn btn-primary btn-sm" disabled={!content.trim() || adding}>
                  {adding ? '…' : 'Add Card'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setContent(''); }}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              className="add-card-toggle"
              onClick={() => setShowForm(true)}
              id={`add-card-btn-${column.id}`}
            >
              <span>+</span> Add a card
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
