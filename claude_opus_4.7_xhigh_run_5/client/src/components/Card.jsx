import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';

export default function Card({ card, index, comments, onAddComment }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddComment(card.id, trimmed);
    setText('');
  }

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={'card-item' + (snapshot.isDragging ? ' dragging' : '')}
        >
          <p className="card-content">{card.content}</p>
          <footer className="card-footer">
            <span className="card-author">{card.author_name}</span>
            <button
              type="button"
              className="link-btn"
              onClick={() => setOpen((v) => !v)}
            >
              {comments.length > 0
                ? `${comments.length} comment${comments.length === 1 ? '' : 's'}`
                : 'Comment'}
              <span aria-hidden> {open ? '▴' : '▾'}</span>
            </button>
          </footer>

          {open && (
            <div className="card-comments">
              {comments.length === 0 && <p className="muted">No comments yet.</p>}
              <ul>
                {comments.map((c) => (
                  <li key={c.id}>
                    <strong>{c.author_name}</strong>
                    <span className="comment-time">
                      {' '}
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                    <div>{c.content}</div>
                  </li>
                ))}
              </ul>
              <form onSubmit={handleSubmit} className="comment-form">
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Add a comment..."
                  maxLength={500}
                />
                <button type="submit" disabled={!text.trim()}>
                  Send
                </button>
              </form>
            </div>
          )}
        </article>
      )}
    </Draggable>
  );
}
