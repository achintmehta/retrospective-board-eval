import { useState, useRef, useEffect } from 'react';
import styles from './CommentPanel.module.css';

export default function CommentPanel({ card, onClose, onAddComment }) {
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [card.comments?.length]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAddComment(card.id, text.trim());
    setText('');
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Comments</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className={styles.cardPreview}>
          <p>{card.content}</p>
          <span className={styles.cardAuthor}>by {card.author_name}</span>
        </div>

        <div className={styles.commentList} ref={listRef}>
          {(!card.comments || card.comments.length === 0) ? (
            <p className={styles.noComments}>No comments yet. Be the first!</p>
          ) : (
            card.comments.map((c) => (
              <div key={c.id} className={styles.comment}>
                <div className={styles.commentHeader}>
                  <span className={styles.commentAuthor}>{c.author_name}</span>
                  <span className={styles.commentTime}>
                    {new Date(c.created_at + 'Z').toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className={styles.commentText}>{c.content}</p>
              </div>
            ))
          )}
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            type="text"
            className={styles.input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment..."
            autoFocus
          />
          <button type="submit" className={styles.sendBtn} disabled={!text.trim()}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 9h12M10 4l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
