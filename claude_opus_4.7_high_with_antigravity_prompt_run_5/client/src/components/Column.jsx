import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Card from './Card.jsx';

export default function Column({ column, onAddCard, onAddComment }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', column },
  });

  function submit(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    onAddCard(column.id, content);
    setText('');
    setAdding(false);
  }

  const cards = column.cards || [];

  return (
    <div
      className={`column ${isOver ? 'is-over' : ''}`}
      data-color={column.color || 'violet'}
      id={`column-${column.id}`}
    >
      <div className="column-head">
        <h3>
          <span className="column-color" aria-hidden="true" />
          {column.title}
        </h3>
        <span className="column-count" id={`column-count-${column.id}`}>{cards.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`column-body ${cards.length === 0 ? 'empty' : ''}`}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.length === 0 && <span>Drop a card here</span>}
          {cards.map((card) => (
            <Card key={card.id} card={card} onAddComment={onAddComment} />
          ))}
        </SortableContext>
      </div>

      <div className="column-foot">
        {!adding && (
          <button
            className="add-card-btn"
            onClick={() => setAdding(true)}
            id={`add-card-btn-${column.id}`}
          >
            + Add card
          </button>
        )}
        {adding && (
          <form className="add-card-form" onSubmit={submit}>
            <textarea
              autoFocus
              placeholder="What went well? What didn't?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              id={`add-card-input-${column.id}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) submit(e);
                else if (e.key === 'Escape') { setText(''); setAdding(false); }
              }}
            />
            <div className="row">
              <span className="hint">Enter to save · Esc to cancel</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => { setText(''); setAdding(false); }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!text.trim()}
                id={`add-card-submit-${column.id}`}
              >
                Add
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
