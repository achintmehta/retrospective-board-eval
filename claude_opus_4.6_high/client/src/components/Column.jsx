import { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import './Column.css';

function Column({ column, onAddCard, onSelectCard }) {
  const [newCardContent, setNewCardContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddCard = (e) => {
    e.preventDefault();
    if (!newCardContent.trim()) return;
    onAddCard(column.id, newCardContent.trim());
    setNewCardContent('');
    setIsAdding(false);
  };

  return (
    <div className="column">
      <div className="column-header">
        <h3>{column.title}</h3>
        <span className="card-count">{column.cards.length}</span>
      </div>

      <Droppable droppableId={String(column.id)}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`cards-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
          >
            {column.cards.map((card, index) => (
              <Draggable key={card.id} draggableId={String(card.id)} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`card ${snapshot.isDragging ? 'dragging' : ''}`}
                    onClick={() => onSelectCard(card)}
                  >
                    <p className="card-content">{card.content}</p>
                    <div className="card-meta">
                      <span className="card-author">{card.author_name}</span>
                      {card.comments.length > 0 && (
                        <span className="comment-count">
                          {card.comments.length} comment{card.comments.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {isAdding ? (
        <form className="add-card-form" onSubmit={handleAddCard}>
          <textarea
            placeholder="Type your card..."
            value={newCardContent}
            onChange={(e) => setNewCardContent(e.target.value)}
            autoFocus
            rows={3}
          />
          <div className="add-card-actions">
            <button type="submit" className="add-card-submit">Add</button>
            <button type="button" className="add-card-cancel" onClick={() => setIsAdding(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button className="add-card-btn" onClick={() => setIsAdding(true)}>
          + Add Card
        </button>
      )}
    </div>
  );
}

export default Column;
