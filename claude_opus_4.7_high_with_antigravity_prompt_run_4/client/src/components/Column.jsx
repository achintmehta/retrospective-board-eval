import React, { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import Avatar from './Avatar.jsx';

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function Composer({ onAdd }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onAdd(trimmed);
      setText('');
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
  }

  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        placeholder="What's on your mind?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        maxLength={2000}
      />
      <div className="composer-actions">
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={!text.trim() || busy}
        >
          {busy ? 'Adding…' : 'Add card'}
        </button>
      </div>
    </form>
  );
}

export default function Column({ column, onAddCard, onOpenComments }) {
  return (
    <section className="column" aria-label={column.title}>
      <header className="column-header">
        <h3 className="column-title">
          <span className="column-accent" />
          {column.title}
        </h3>
        <span className="column-count">{column.cards.length}</span>
      </header>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`cards-list ${snapshot.isDraggingOver ? 'is-over' : ''}`}
          >
            {column.cards.map((card, idx) => (
              <Draggable key={card.id} draggableId={card.id} index={idx}>
                {(prov, snap) => (
                  <article
                    ref={prov.innerRef}
                    {...prov.draggableProps}
                    {...prov.dragHandleProps}
                    className={`card ${snap.isDragging ? 'dragging' : ''}`}
                    id={`card-${card.id}`}
                  >
                    <div className="card-content">{card.content}</div>
                    <div className="card-footer">
                      <span className="author">
                        <Avatar name={card.author_name} />
                        <span>{card.author_name}</span>
                        <span style={{ color: 'var(--text-mute)', marginLeft: 4 }}>
                          · {timeAgo(card.created_at)}
                        </span>
                      </span>
                      <div className="card-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => onOpenComments(card)}
                          aria-label="View comments"
                          id={`card-${card.id}-comments`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          </svg>
                          <span>{(card.comments || []).length}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <Composer onAdd={(content) => onAddCard(column.id, content)} />
    </section>
  );
}
