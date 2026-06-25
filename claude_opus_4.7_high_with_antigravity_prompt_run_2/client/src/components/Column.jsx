import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import Card from './Card.jsx';

export default function Column({ column, displayName, onAddCard, onAddComment }) {
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);

  function submit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onAddCard(column.id, text);
    setDraft('');
    setAdding(false);
  }

  return (
    <section className="column glass" aria-label={`Column: ${column.title}`}>
      <header className="column-header">
        <div className="column-title">
          <span className="column-swatch" aria-hidden="true" />
          {column.title}
        </div>
        <span className="count-pill">{column.cards.length}</span>
      </header>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`cards ${snapshot.isDraggingOver ? 'drop-over' : ''}`}
          >
            {column.cards.map((card, idx) => (
              <Card
                key={card.id}
                card={card}
                index={idx}
                displayName={displayName}
                onAddComment={onAddComment}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {adding ? (
        <form className="add-card-form" onSubmit={submit}>
          <textarea
            className="textarea"
            autoFocus
            value={draft}
            placeholder="What's on your mind?"
            maxLength={1000}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
              if (e.key === 'Escape') { setAdding(false); setDraft(''); }
            }}
          />
          <div className="row">
            <button type="submit" className="btn btn-primary btn-sm" disabled={!draft.trim()}>
              Add card
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setAdding(false); setDraft(''); }}
            >
              Cancel
            </button>
            <span className="spacer" />
            <span className="text-dim mono" style={{ fontSize: '0.72rem' }}>⌘/Ctrl + Enter</span>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setAdding(true)}
          aria-label={`Add card to ${column.title}`}
        >
          <PlusIcon /> Add a card
        </button>
      )}
    </section>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
