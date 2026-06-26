import { useState } from 'react';
import Card from './Card.jsx';
import AddCardForm from './AddCardForm.jsx';

export default function Column({
  column,
  onAddCard,
  onOpenComments,
  onCardDragStart,
  onCardDragEnd,
  onCardDrop,
  draggingCardId,
}) {
  const [dragOver, setDragOver] = useState(false);
  const [dropIndex, setDropIndex] = useState(null);

  function handleDragOver(e) {
    e.preventDefault();
    setDragOver(true);
    // determine drop index by mouse position
    const cardEls = Array.from(e.currentTarget.querySelectorAll('.card'));
    let idx = cardEls.length;
    for (let i = 0; i < cardEls.length; i++) {
      const rect = cardEls[i].getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        idx = i;
        break;
      }
    }
    setDropIndex(idx);
  }

  function handleDragLeave(e) {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragOver(false);
    setDropIndex(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    const targetIdx = dropIndex ?? column.cards.length;
    setDragOver(false);
    setDropIndex(null);
    onCardDrop(column.id, targetIdx);
  }

  return (
    <div className={`column${dragOver ? ' drop-target' : ''}`}>
      <div className="column-header">
        <h3>{column.title}</h3>
        <span className="column-count">{column.cards.length}</span>
      </div>
      <div
        className="column-body"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {column.cards.map((card, i) => (
          <div key={card.id}>
            {dragOver && dropIndex === i && <div className="drop-indicator" />}
            <Card
              card={card}
              onOpenComments={onOpenComments}
              onDragStart={onCardDragStart}
              onDragEnd={onCardDragEnd}
              dragging={draggingCardId === card.id}
            />
          </div>
        ))}
        {dragOver && dropIndex === column.cards.length && (
          <div className="drop-indicator" />
        )}
        <AddCardForm onAdd={(content) => onAddCard(column.id, content)} />
      </div>
    </div>
  );
}
