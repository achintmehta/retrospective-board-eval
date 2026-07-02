export default function CardItem({ card, accentColor, onClick }) {
  const commentCount = card.comments?.length || 0

  return (
    <div style={styles.card} onClick={onClick}>
      <div style={{ ...styles.topBorder, background: accentColor }} />
      <p style={styles.content}>{card.content}</p>
      <div style={styles.footer}>
        <span style={styles.author}>{card.author_name}</span>
        {commentCount > 0 && (
          <span style={styles.commentBadge}>
            &#128172; {commentCount}
          </span>
        )}
      </div>
    </div>
  )
}

const styles = {
  card: {
    background: 'linear-gradient(135deg, #222632 0%, #262b3a 100%)',
    border: '1px solid #2e3346',
    borderRadius: '10px',
    padding: '14px 16px',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    transition: 'border-color 200ms, transform 150ms, box-shadow 200ms',
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    opacity: 0.6,
  },
  content: {
    fontSize: '13px',
    color: '#e8eaf0',
    lineHeight: 1.5,
    margin: 0,
    wordBreak: 'break-word',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '10px',
  },
  author: {
    fontSize: '11px',
    color: '#6b7089',
    fontWeight: 500,
  },
  commentBadge: {
    fontSize: '11px',
    color: '#9499ad',
    background: '#181b24',
    padding: '2px 8px',
    borderRadius: '8px',
  },
}
