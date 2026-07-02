import styles from './CardItem.module.css';

export default function CardItem({ card, color, isDragging, onClick }) {
  return (
    <div
      className={`${styles.card} ${isDragging ? styles.dragging : ''}`}
      onClick={onClick}
    >
      <div className={styles.colorBar} style={{ background: color }} />
      <div className={styles.body}>
        <p className={styles.content}>{card.content}</p>
        <div className={styles.footer}>
          <span className={styles.author}>{card.author_name}</span>
          {card.comments?.length > 0 && (
            <span className={styles.commentCount}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 3a1 1 0 011-1h8a1 1 0 011 1v5a1 1 0 01-1 1H6l-2.5 2V9H3a1 1 0 01-1-1V3z" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              {card.comments.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
