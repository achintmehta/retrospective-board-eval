import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { avatarGradient, fullDate, initials, timeAgo } from '../lib/format.js';
import CommentList from './CommentList.jsx';

export default function Card({ card, index, onAddComment }) {
  const [showComments, setShowComments] = useState(false);
  const commentCount = card.comments?.length ?? 0;

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card${snapshot.isDragging ? ' is-dragging' : ''}`}
          id={`card-${card.id}`}
        >
          <div className="card-content">{card.content}</div>
          <div className="card-meta">
            <span className="card-author">
              <span
                className="avatar"
                style={{ '--avatar-grad': avatarGradient(card.authorName) }}
                aria-hidden="true"
              >
                {initials(card.authorName)}
              </span>
              <span>{card.authorName}</span>
              <span className="muted">·</span>
              <span title={fullDate(card.createdAt)}>{timeAgo(card.createdAt)}</span>
            </span>
            <span className="card-actions">
              <button
                type="button"
                className="card-action"
                onClick={() => setShowComments((v) => !v)}
                aria-expanded={showComments}
                aria-controls={`comments-${card.id}`}
                id={`toggle-comments-${card.id}`}
              >
                💬 {commentCount}
                <span className="muted">{showComments ? '▴' : '▾'}</span>
              </button>
            </span>
          </div>
          {showComments && (
            <CommentList
              cardId={card.id}
              comments={card.comments || []}
              onAddComment={onAddComment}
            />
          )}
        </article>
      )}
    </Draggable>
  );
}
