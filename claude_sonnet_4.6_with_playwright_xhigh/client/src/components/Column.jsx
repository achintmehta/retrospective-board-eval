import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import CardItem from './CardItem';

export default function Column({ column, cards, onAddCard, onCardClick, commentCounts }) {
  const [cardContent, setCardContent] = useState('');
  const [showAddCard, setShowAddCard] = useState(false);

  const handleAddCard = (e) => {
    e.preventDefault();
    if (!cardContent.trim()) return;
    onAddCard(column.id, cardContent.trim());
    setCardContent('');
    setShowAddCard(false);
  };

  return (
    <div style={{
      minWidth: 280,
      maxWidth: 320,
      background: '#ebecf0',
      borderRadius: 8,
      padding: '0.75rem',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem', padding: '0 0.125rem' }}>
        <h3 style={{
          flex: 1,
          fontWeight: 600,
          fontSize: '0.875rem',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: '#44546f',
        }}>
          {column.title}
        </h3>
        <span style={{
          background: '#c1c7d0',
          borderRadius: 10,
          padding: '0 0.4rem',
          fontSize: '0.75rem',
          color: '#44546f',
          fontWeight: 600,
        }}>
          {cards.length}
        </span>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              minHeight: 80,
              background: snapshot.isDraggingOver ? '#d0d4de' : 'transparent',
              borderRadius: 4,
              transition: 'background 0.15s',
              flex: 1,
            }}
          >
            {cards.map((card, index) => (
              <CardItem
                key={card.id}
                card={card}
                index={index}
                onClick={() => onCardClick(card)}
                commentCount={(commentCounts[card.id] || []).length}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {showAddCard ? (
        <form onSubmit={handleAddCard} style={{ marginTop: '0.5rem' }}>
          <textarea
            autoFocus
            value={cardContent}
            onChange={e => setCardContent(e.target.value)}
            placeholder="What needs to be noted?"
            rows={3}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1.5px solid #ccc',
              borderRadius: 4,
              resize: 'vertical',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem' }}>
            <button
              type="submit"
              style={{
                background: '#4f46e5',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '0.3rem 0.75rem',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              Add Card
            </button>
            <button
              type="button"
              onClick={() => { setShowAddCard(false); setCardContent(''); }}
              style={{ background: 'none', border: 'none', color: '#666', padding: '0.3rem 0.5rem', fontSize: '1rem' }}
            >
              ✕
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAddCard(true)}
          style={{
            marginTop: '0.5rem',
            width: '100%',
            background: 'none',
            border: 'none',
            padding: '0.4rem',
            color: '#44546f',
            textAlign: 'left',
            borderRadius: 4,
            fontSize: '0.875rem',
          }}
        >
          + Add card
        </button>
      )}
    </div>
  );
}
