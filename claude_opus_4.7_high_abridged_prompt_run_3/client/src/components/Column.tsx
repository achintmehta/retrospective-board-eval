import { FormEvent, useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import type { Card, BoardColumn, Comment } from '../api';

interface Props {
  column: BoardColumn & { cards: (Card & { comments: Comment[] })[] };
  index: number;
  onAddCard: (columnId: string, content: string) => void;
  onOpenCard: (cardId: string) => void;
}

const COLUMN_ACCENTS = [
  'linear-gradient(135deg, #34d399, #10b981)',
  'linear-gradient(135deg, #fbbf24, #f97316)',
  'linear-gradient(135deg, #a78bfa, #6366f1)',
  'linear-gradient(135deg, #38bdf8, #0ea5e9)',
  'linear-gradient(135deg, #f472b6, #ec4899)',
  'linear-gradient(135deg, #94a3b8, #64748b)',
];

export default function Column({ column, index, onAddCard, onOpenCard }: Props) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddCard(column.id, trimmed);
    setText('');
    setAdding(false);
  }

  const accent = COLUMN_ACCENTS[index % COLUMN_ACCENTS.length];

  return (
    <div className="column">
      <div className="column-head">
        <span className="column-accent" style={{ background: accent }} />
        <h3 className="column-title">{column.title}</h3>
        <span className="column-count">{column.cards.length}</span>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column-drop ${snapshot.isDraggingOver ? 'is-over' : ''}`}
          >
            {column.cards.map((card, i) => (
              <Draggable draggableId={card.id} index={i} key={card.id}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className={`card ${dragSnapshot.isDragging ? 'is-dragging' : ''}`}
                    onClick={() => onOpenCard(card.id)}
                  >
                    <p className="card-content">{card.content}</p>
                    <div className="card-foot">
                      <span className="card-author">
                        <span
                          className="author-avatar"
                          style={{ background: authorColor(card.author_name) }}
                        >
                          {card.author_name.slice(0, 1).toUpperCase()}
                        </span>
                        {card.author_name}
                      </span>
                      {card.comments.length > 0 && (
                        <span className="card-comments" title="Comments">
                          💬 {card.comments.length}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}

            {adding ? (
              <form onSubmit={handleSubmit} className="card add-card-form">
                <textarea
                  autoFocus
                  className="textarea"
                  placeholder="What happened?"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                    if (e.key === 'Escape') {
                      setAdding(false);
                      setText('');
                    }
                  }}
                  maxLength={500}
                  rows={3}
                />
                <div className="add-card-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setAdding(false);
                      setText('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-small"
                    disabled={!text.trim()}
                  >
                    Add
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="add-card-btn"
                onClick={() => setAdding(true)}
              >
                <span>＋</span> Add card
              </button>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

function authorColor(name: string): string {
  const palettes = [
    'linear-gradient(135deg, #a78bfa, #6366f1)',
    'linear-gradient(135deg, #34d399, #059669)',
    'linear-gradient(135deg, #fbbf24, #f59e0b)',
    'linear-gradient(135deg, #f472b6, #db2777)',
    'linear-gradient(135deg, #38bdf8, #0284c7)',
    'linear-gradient(135deg, #fb7185, #e11d48)',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return palettes[hash % palettes.length];
}
