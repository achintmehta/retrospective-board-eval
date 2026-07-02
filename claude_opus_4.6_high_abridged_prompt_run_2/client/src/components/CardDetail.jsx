import { useState } from 'react'
import styles from './CardDetail.module.css'

export default function CardDetail({ card, onClose, onAddComment }) {
  const [comment, setComment] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!comment.trim()) return
    onAddComment(card.id, comment.trim())
    setComment('')
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>&#10005;</button>

        <div className={styles.cardContent}>
          <p className={styles.content}>{card.content}</p>
          <span className={styles.author}>by {card.author_name}</span>
        </div>

        <div className={styles.commentsSection}>
          <h3 className={styles.commentsTitle}>
            Comments ({card.comments.length})
          </h3>

          <div className={styles.commentsList}>
            {card.comments.length === 0 ? (
              <p className={styles.noComments}>No comments yet</p>
            ) : (
              card.comments.map(c => (
                <div key={c.id} className={styles.comment}>
                  <div className={styles.commentHeader}>
                    <span className={styles.commentAuthor}>{c.author_name}</span>
                    <span className={styles.commentDate}>
                      {new Date(c.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className={styles.commentText}>{c.content}</p>
                </div>
              ))
            )}
          </div>

          <form className={styles.commentForm} onSubmit={handleSubmit}>
            <input
              className={styles.commentInput}
              type="text"
              placeholder="Add a comment..."
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
            <button className={styles.commentBtn} type="submit" disabled={!comment.trim()}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
