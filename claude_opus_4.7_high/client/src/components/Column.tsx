import { useState } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import type { BoardColumn } from '../types';
import { CardItem } from './CardItem';

interface Props {
  column: BoardColumn;
  onAddCard: (columnId: string, content: string) => void;
  onAddComment: (cardId: string, content: string) => void;
}

export function Column({ column, onAddCard, onAddComment }: Props) {
  const [draft, setDraft] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAddCard(column.id, trimmed);
    setDraft('');
  }

  return (
    <div className="column">
      <div className="column-header">
        <h3>{column.title}</h3>
        <span className="count">{column.cards.length}</span>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column-body${snapshot.isDraggingOver ? ' is-dragging-over' : ''}`}
          >
            {column.cards.map((card, idx) => (
              <Draggable draggableId={card.id} index={idx} key={card.id}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className={`card-wrapper${dragSnapshot.isDragging ? ' is-dragging' : ''}`}
                  >
                    <CardItem card={card} onAddComment={onAddComment} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <form className="add-card-form" onSubmit={submit}>
        <input
          type="text"
          placeholder="Add a card…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" disabled={!draft.trim()}>
          Add
        </button>
      </form>
    </div>
  );
}
