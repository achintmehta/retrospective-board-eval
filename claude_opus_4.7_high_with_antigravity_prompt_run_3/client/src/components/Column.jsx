import { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Card from './Card.jsx';

export default function Column({ column, index, onAddCard, onAddComment }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
  });

  useEffect(() => {
    if (adding && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [adding]);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddCard(column.id, trimmed);
    setText('');
    setAdding(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      setAdding(false);
      setText('');
    }
  }

  const cardIds = column.cards.map((c) => c.id);

  return (
    <section className="column" data-index={index} aria-label={column.title}>
      <header className="column__header">
        <h3 className="column__title">
          <span className="column__dot" aria-hidden="true" />
          {column.title}
        </h3>
        <span className="column__count">{column.cards.length}</span>
      </header>

      <div
        ref={setNodeRef}
        className={`column__list ${isOver ? 'is-over' : ''}`}
        id={`column-list-${column.id}`}
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => (
            <Card key={card.id} card={card} onAddComment={onAddComment} />
          ))}
        </SortableContext>
      </div>

      <div className="column__add">
        {adding ? (
          <div className="column__add-form">
            <textarea
              ref={textareaRef}
              className="textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What happened? (⌘/Ctrl + Enter to submit)"
              maxLength={1000}
              id={`add-card-input-${column.id}`}
            />
            <div className="column__add-form-actions">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  setAdding(false);
                  setText('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={submit}
                disabled={!text.trim()}
                id={`add-card-submit-${column.id}`}
              >
                Add card
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="column__add-trigger"
            onClick={() => setAdding(true)}
            id={`add-card-trigger-${column.id}`}
          >
            <PlusIcon /> Add card
          </button>
        )}
      </div>
    </section>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
