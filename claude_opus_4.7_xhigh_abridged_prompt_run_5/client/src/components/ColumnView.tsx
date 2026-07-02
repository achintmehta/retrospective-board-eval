import { useState, type FormEvent } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { ColumnWithCards } from '../types';
import { CardView } from './CardView';

export function ColumnView({
  column,
  isDropTarget,
  onAddCard,
  onAddComment,
}: {
  column: ColumnWithCards;
  isDropTarget: boolean;
  onAddCard: (columnId: string, content: string) => void;
  onAddComment: (cardId: string, content: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const { setNodeRef } = useDroppable({
    id: `col:${column.id}`,
    data: { type: 'column', columnId: column.id },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    onAddCard(column.id, content);
    setDraft('');
  };

  const cardIds = column.cards.map((c) => c.id);

  return (
    <div className={`column${isDropTarget ? ' is-drop-target' : ''}`} ref={setNodeRef}>
      <div className="column-header">
        <div className="column-title">
          <span className="swatch" />
          {column.title}
        </div>
        <span className="column-count">{column.cards.length}</span>
      </div>
      <div className="column-body">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => (
            <CardView key={card.id} card={card} onAddComment={onAddComment} />
          ))}
        </SortableContext>
        {column.cards.length === 0 && (
          <div className="muted" style={{ padding: '8px 4px', fontSize: 13 }}>
            No cards yet.
          </div>
        )}
      </div>
      <div className="column-footer">
        <form className="add-card" onSubmit={submit}>
          <textarea
            className="textarea"
            placeholder="Write a card…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                submit(e as unknown as FormEvent);
              }
            }}
            maxLength={500}
          />
          <button className="btn btn-primary btn-sm" disabled={!draft.trim()}>
            Add card
          </button>
        </form>
      </div>
    </div>
  );
}
