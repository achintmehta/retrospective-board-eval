const styles = {
  card: {
    background: '#fff',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  content: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 12,
    color: '#999',
  },
  commentBtn: {
    background: 'none',
    border: 'none',
    color: '#646cff',
    fontSize: 12,
    cursor: 'pointer',
    padding: 0,
  },
}

export default function Card({ card, onOpenComments }) {
  const commentCount = card.comments ? card.comments.length : 0

  return (
    <div style={styles.card}>
      <div style={styles.content}>{card.content}</div>
      <div style={styles.footer}>
        <span>{card.author_name}</span>
        <button style={styles.commentBtn} onClick={() => onOpenComments(card)}>
          {commentCount > 0 ? `${commentCount} comment${commentCount !== 1 ? 's' : ''}` : 'Comment'}
        </button>
      </div>
    </div>
  )
}
