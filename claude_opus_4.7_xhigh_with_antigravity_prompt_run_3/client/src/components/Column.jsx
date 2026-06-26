import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { initialsOf } from '../session.js';

const COLUMN_THEMES = [
  { match: /well|liked|glad|love/i, accent: 'var(--col-good)', emoji: '🌟' },
  { match: /improve|lacked|need|mad|sad|frustr/i, accent: 'var(--col-improve)', emoji: '🔧' },
  { match: /action|longed|next|learn/i, accent: 'var(--col-action)', emoji: '🚀' },
];

function themeFor(title) {
  for (const t of COLUMN_THEMES) {
    if (t.match.test(title)) return t;
  }
  return { accent: 'var(--col-neutral)', emoji: '🧩' };
}

export default function Column({ column, cards, commentCounts, onAddCard, onOpenCard }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const theme = themeFor(column.title);

  async function handleAdd(event) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onAddCard(column.id, trimmed);
      setText('');
      setAdding(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="column" style={{ '--col-accent': theme.accent }} aria-label={`Column ${column.title}`}>
      <header className="column-head">
        <div className="column-title">
          <span className="column-emoji" aria-hidden="true">{theme.emoji}</span>
          <span>{column.title}</span>
        </div>
        <span className="column-count" id={`column-count-${column.id}`}>{cards.length}</span>
      </header>

      <Droppable droppableId={String(column.id)}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column-list${snapshot.isDraggingOver ? ' is-dragging-over' : ''}`}
            id={`column-list-${column.id}`}
          >
            {cards.map((card, idx) => (
              <Draggable key={card.id} draggableId={String(card.id)} index={idx}>
                {(prov, snap) => {
                  const node = (
                    <article
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      {...prov.dragHandleProps}
                      className={`card${snap.isDragging ? ' is-dragging' : ''}`}
                      onClick={() => onOpenCard(card)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onOpenCard(card);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open card: ${card.content.slice(0, 60)}`}
                      id={`card-${card.id}`}
                    >
                      <div className="card-content">{card.content}</div>
                      <div className="card-footer">
                        <span className="card-author">
                          <span className="author-mini" aria-hidden="true">{initialsOf(card.author_name)}</span>
                          {card.author_name || 'Anonymous'}
                        </span>
                        <span className="card-meta-right">
                          {commentCounts[card.id] > 0 && (
                            <span className="comment-pill" title={`${commentCounts[card.id]} comments`}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
                              </svg>
                              {commentCounts[card.id]}
                            </span>
                          )}
                        </span>
                      </div>
                    </article>
                  );
                  // Portal the card to <body> while dragging so its
                  // position: fixed is anchored to the viewport, not to the
                  // column (which has backdrop-filter creating a containing
                  // block, and overflow: hidden which would clip it).
                  if (snap.isDragging) return createPortal(node, document.body);
                  return node;
                }}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <div className="column-add">
        {adding ? (
          <form onSubmit={handleAdd} id={`add-card-form-${column.id}`}>
            <textarea
              autoFocus
              className="textarea"
              placeholder={`What about "${column.title}"?`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAdd(e);
                } else if (e.key === 'Escape') {
                  setAdding(false);
                  setText('');
                }
              }}
            />
            <div className="column-add-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setText(''); }} id={`add-card-cancel-${column.id}`}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={!text.trim() || submitting} id={`add-card-submit-${column.id}`}>
                {submitting ? 'Adding…' : 'Add card'}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="column-add-toggle"
            onClick={() => setAdding(true)}
            id={`add-card-toggle-${column.id}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            Add card
          </button>
        )}
      </div>
    </section>
  );
}
