import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { formatRelative, initials, colorFor } from '../lib/format.js';

export default function Card({ card, index, onOpen }) {
  const [from, to] = colorFor(card.author_name);
  const commentCount = card.comments?.length || 0;

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={
            'card' + (snapshot.isDragging ? ' card-dragging' : '')
          }
          onClick={() => onOpen(card)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onOpen(card);
          }}
        >
          <div className="card-content">{card.content}</div>
          <div className="card-foot">
            <div className="avatar-line">
              <span
                className="avatar"
                style={{
                  background: `linear-gradient(135deg, ${from}, ${to})`,
                }}
                title={card.author_name}
              >
                {initials(card.author_name)}
              </span>
              <span className="author-name">{card.author_name}</span>
            </div>
            <div className="card-meta">
              {commentCount > 0 && (
                <span className="comment-badge" title="Comments">
                  <CommentIcon />
                  {commentCount}
                </span>
              )}
              <span className="card-time">{formatRelative(card.created_at)}</span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

function CommentIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
