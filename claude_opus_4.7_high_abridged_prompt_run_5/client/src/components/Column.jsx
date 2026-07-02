import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import Card from './Card.jsx';

export default function Column({ column, onAddCard, onOpenCard }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  function submit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onAddCard(column.id, text);
    setDraft('');
    setAdding(false);
  }

  return (
    <div className="column">
      <div
        className="column-head"
        style={{
          background: `linear-gradient(135deg, ${column.color || '#6366f1'}22, transparent)`,
          borderColor: `${column.color || '#6366f1'}55`,
        }}
      >
        <div className="column-title-row">
          <span
            className="column-dot"
            style={{ background: column.color || '#6366f1' }}
          />
          <h3 className="column-title">{column.title}</h3>
          <span className="column-count">{column.cards.length}</span>
        </div>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={
              'column-body' +
              (snapshot.isDraggingOver ? ' column-drop' : '')
            }
          >
            {column.cards.map((card, i) => (
              <Card
                key={card.id}
                card={card}
                index={i}
                onOpen={onOpenCard}
              />
            ))}
            {provided.placeholder}

            {adding ? (
              <form className="add-card-form" onSubmit={submit}>
                <textarea
                  autoFocus
                  className="add-card-input"
                  placeholder="What's on your mind?"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
                    if (e.key === 'Escape') {
                      setAdding(false);
                      setDraft('');
                    }
                  }}
                  rows={3}
                  maxLength={2000}
                />
                <div className="add-card-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setAdding(false);
                      setDraft('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={!draft.trim()}
                  >
                    Add card
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="add-card-trigger"
                onClick={() => setAdding(true)}
              >
                <span className="plus">+</span> Add card
              </button>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
