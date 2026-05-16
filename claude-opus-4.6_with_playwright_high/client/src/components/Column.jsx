import { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import Card from './Card.jsx';

export default function Column({ column, onAddCard, onAddComment }) {
  const [newCardText, setNewCardText] = useState('');
  const [showForm, setShowForm] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!newCardText.trim()) return;
    onAddCard(column.id, newCardText.trim());
    setNewCardText('');
    setShowForm(false);
  }

  return (
    <div style={{
      background: 'var(--column-bg)', borderRadius: 8, padding: 12,
      minWidth: 280, width: 280, border: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
    }}>
      <h3 style={{ fontSize: 15, marginBottom: 12, fontWeight: 600 }}>{column.title}</h3>

      <Droppable droppableId={column.id}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 40, flex: 1 }}
          >
            {column.cards && column.cards.map((card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <Card
                      card={card}
                      columnId={column.id}
                      onAddComment={onAddComment}
                      isDragging={snapshot.isDragging}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {showForm ? (
        <form onSubmit={handleSubmit} style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <textarea
            value={newCardText}
            onChange={e => setNewCardText(e.target.value)}
            placeholder="What's on your mind?"
            autoFocus
            rows={3}
            style={{ width: '100%', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="submit" style={{ background: 'var(--primary)', color: '#fff', fontSize: 13 }}>
              Add
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setNewCardText(''); }}
              style={{ background: 'var(--border)', color: 'var(--text)', fontSize: 13 }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          style={{
            marginTop: 8, background: 'transparent', color: 'var(--primary)',
            border: '1px dashed var(--border)', padding: '8px', fontSize: 13,
          }}
        >
          + Add Card
        </button>
      )}
    </div>
  );
}
