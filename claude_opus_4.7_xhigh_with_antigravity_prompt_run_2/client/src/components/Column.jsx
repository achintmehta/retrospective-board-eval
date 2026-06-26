import { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import Card from './Card.jsx';

const COLUMN_TINTS = [
  { accent: 'linear-gradient(135deg, #7c5cff, #22d3ee)', label: 'aurora' },
  { accent: 'linear-gradient(135deg, #ff7ab8, #ffb45a)', label: 'sunset' },
  { accent: 'linear-gradient(135deg, #34d399, #22d3ee)', label: 'mint' },
  { accent: 'linear-gradient(135deg, #a78bfa, #f472b6)', label: 'orchid' },
  { accent: 'linear-gradient(135deg, #60a5fa, #34d399)', label: 'lagoon' },
  { accent: 'linear-gradient(135deg, #ffb45a, #ff6b6b)', label: 'ember' },
];

export default function Column({ column, index, onAddCard, onOpenCard }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const tint = COLUMN_TINTS[index % COLUMN_TINTS.length];
  const cardIds = column.cards.map((c) => c.id);

  const { setNodeRef, isOver } = useDroppable({
    id: `column:${column.id}`,
    data: { type: 'column', columnId: column.id },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = draft.trim();
    if (!value) return;
    onAddCard(column.id, value);
    setDraft('');
  };

  return (
    <section className={`column ${isOver ? 'column-active' : ''}`}>
      <header className="column-header">
        <div className="column-title-row">
          <span className="column-accent" style={{ background: tint.accent }} />
          <h2 className="column-title">{column.title}</h2>
          <span className="column-count">{column.cards.length}</span>
        </div>
      </header>
      <div ref={setNodeRef} className="column-drop">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          <div className="column-cards">
            {column.cards.length === 0 && !adding && (
              <button
                type="button"
                className="column-empty"
                onClick={() => setAdding(true)}
              >
                <span>+ Drop your first card here</span>
              </button>
            )}
            {column.cards.map((card) => (
              <Card key={card.id} card={card} onOpen={onOpenCard} />
            ))}
          </div>
        </SortableContext>
      </div>
      <div className="column-footer">
        {adding ? (
          <form className="card-form" onSubmit={handleSubmit}>
            <textarea
              autoFocus
              className="textarea card-form-input"
              placeholder="What's on your mind?"
              value={draft}
              maxLength={1000}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSubmit(e);
                }
                if (e.key === 'Escape') {
                  setAdding(false);
                  setDraft('');
                }
              }}
            />
            <div className="card-form-actions">
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
              <button type="submit" className="btn btn-primary btn-sm" disabled={!draft.trim()}>
                Add card
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="add-card-btn"
            onClick={() => setAdding(true)}
          >
            <span className="add-card-icon" aria-hidden="true">+</span>
            Add a card
          </button>
        )}
      </div>
    </section>
  );
}
