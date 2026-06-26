import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import CardItem from './CardItem';
import type { BoardColumn, Card } from '../pages/BoardPage';

interface ColumnProps {
  column: BoardColumn;
  onAddCard: (columnId: string, content: string) => void;
  onOpenComments: (card: Card) => void;
}

export default function Column({ column, onAddCard, onOpenComments }: ColumnProps) {
  const [adding, setAdding] = useState(false);
  const [content, setContent] = useState('');

  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const handleSubmit = () => {
    if (!content.trim()) return;
    onAddCard(column.id, content.trim());
    setContent('');
    setAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setAdding(false);
      setContent('');
    }
  };

  return (
    <div className={`column${isOver ? ' drag-over' : ''}`} ref={setNodeRef}>
      <div className="column-header">
        <h3>{column.title}</h3>
        <span className="column-count">{column.cards.length}</span>
      </div>

      <div className="column-cards">
        {column.cards.map(card => (
          <CardItem key={card.id} card={card} onOpenComments={onOpenComments} />
        ))}
      </div>

      <div className="column-footer">
        {adding ? (
          <div className="add-card-form">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write your thoughts..."
              autoFocus
              id={`add-card-textarea-${column.id}`}
            />
            <div className="add-card-actions">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setAdding(false); setContent(''); }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSubmit}
                id={`submit-card-${column.id}`}
              >
                Add Card
              </button>
            </div>
          </div>
        ) : (
          <button
            className="add-card-btn"
            onClick={() => setAdding(true)}
            id={`add-card-btn-${column.id}`}
          >
            + Add a card
          </button>
        )}
      </div>
    </div>
  );
}
