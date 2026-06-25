import { useState } from 'react'
import { Droppable, Draggable } from '@hello-pangea/dnd'

function Column({ column, onAddCard, onCardClick }) {
  const [newCardText, setNewCardText] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!newCardText.trim()) return
    onAddCard(column.id, newCardText.trim())
    setNewCardText('')
    setIsAdding(false)
  }

  return (
    <div style={styles.column}>
      <div style={styles.header}>
        <h3 style={styles.title}>{column.title}</h3>
        <span style={styles.count}>{column.cards.length}</span>
      </div>

      <Droppable droppableId={String(column.id)}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              ...styles.cardList,
              background: snapshot.isDraggingOver ? '#e0e7ff' : 'transparent',
            }}
          >
            {column.cards.map((card, index) => (
              <Draggable key={card.id} draggableId={String(card.id)} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => onCardClick(card)}
                    style={{
                      ...styles.card,
                      boxShadow: snapshot.isDragging
                        ? '0 4px 12px rgba(0,0,0,0.15)'
                        : '0 1px 3px rgba(0,0,0,0.08)',
                      ...provided.draggableProps.style,
                    }}
                  >
                    <p style={styles.cardContent}>{card.content}</p>
                    <div style={styles.cardMeta}>
                      <span>{card.author_name}</span>
                      {card.comments && card.comments.length > 0 && (
                        <span>{card.comments.length} comment{card.comments.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {isAdding ? (
        <form onSubmit={handleSubmit} style={styles.addForm}>
          <textarea
            placeholder="What's on your mind?"
            value={newCardText}
            onChange={e => setNewCardText(e.target.value)}
            autoFocus
            rows={3}
            style={styles.textarea}
          />
          <div style={styles.addActions}>
            <button type="submit" style={styles.submitBtn}>Add</button>
            <button type="button" onClick={() => { setIsAdding(false); setNewCardText('') }} style={styles.cancelBtn}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setIsAdding(true)} style={styles.addBtn}>
          + Add Card
        </button>
      )}
    </div>
  )
}

const styles = {
  column: {
    minWidth: 300,
    maxWidth: 300,
    background: 'var(--column-bg)',
    borderRadius: 10,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 180px)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 8px 12px',
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    margin: 0,
  },
  count: {
    fontSize: 13,
    color: 'var(--text-muted)',
    background: 'var(--border)',
    borderRadius: 10,
    padding: '2px 8px',
  },
  cardList: {
    flex: 1,
    overflowY: 'auto',
    minHeight: 40,
    borderRadius: 6,
    padding: 4,
    transition: 'background 0.2s',
  },
  card: {
    background: 'var(--surface)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    cursor: 'pointer',
    border: '1px solid var(--border)',
  },
  cardContent: {
    fontSize: 14,
    lineHeight: 1.5,
    margin: 0,
    wordBreak: 'break-word',
  },
  cardMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 8,
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  addForm: {
    marginTop: 8,
  },
  textarea: {
    width: '100%',
    padding: 10,
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 14,
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
  },
  addActions: {
    display: 'flex',
    gap: 8,
    marginTop: 8,
  },
  submitBtn: {
    padding: '6px 16px',
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
  },
  cancelBtn: {
    padding: '6px 16px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 14,
    color: 'var(--text-muted)',
  },
  addBtn: {
    marginTop: 8,
    padding: '8px',
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    color: 'var(--text-muted)',
    textAlign: 'left',
  },
}

export default Column
