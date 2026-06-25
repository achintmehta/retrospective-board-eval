import { useState } from 'react'
import { Droppable, Draggable } from '@hello-pangea/dnd'

const styles = {
  column: {
    background: '#ebecf0', borderRadius: 8, width: 280, minWidth: 280,
    display: 'flex', flexDirection: 'column', maxHeight: '100%',
  },
  header: { padding: '12px 16px', fontWeight: 600, fontSize: 15 },
  cards: { padding: '0 8px 8px', overflowY: 'auto', flex: 1 },
  card: {
    background: 'white', borderRadius: 6, padding: 12, marginBottom: 8,
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)', cursor: 'pointer', fontSize: 14,
  },
  cardAuthor: { fontSize: 11, color: '#888', marginTop: 6 },
  commentCount: { fontSize: 11, color: '#4a90d9', marginTop: 4 },
  addForm: { padding: '0 8px 8px' },
  addBtn: { width: '100%', background: 'transparent', color: '#666', fontSize: 13, textAlign: 'left', padding: '8px 12px' },
  textarea: { width: '100%', minHeight: 60, resize: 'vertical', marginBottom: 8 },
  formButtons: { display: 'flex', gap: 8 },
  cancelBtn: { background: 'transparent', color: '#666' },
}

export default function Column({ column, onAddCard, onSelectCard }) {
  const [adding, setAdding] = useState(false)
  const [content, setContent] = useState('')

  const handleAdd = (e) => {
    e.preventDefault()
    if (!content.trim()) return
    onAddCard(column.id, content.trim())
    setContent('')
    setAdding(false)
  }

  return (
    <div style={styles.column}>
      <div style={styles.header}>{column.title}</div>
      <Droppable droppableId={String(column.id)}>
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} style={styles.cards}>
            {(column.cards || []).map((card, index) => (
              <Draggable key={card.id} draggableId={String(card.id)} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{ ...styles.card, ...(snapshot.isDragging ? { boxShadow: '0 4px 12px rgba(0,0,0,0.2)' } : {}), ...provided.draggableProps.style }}
                    onClick={() => onSelectCard(card)}
                  >
                    <div>{card.content}</div>
                    <div style={styles.cardAuthor}>by {card.author_name}</div>
                    {card.comments && card.comments.length > 0 && (
                      <div style={styles.commentCount}>
                        {card.comments.length} comment{card.comments.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <div style={styles.addForm}>
        {adding ? (
          <form onSubmit={handleAdd}>
            <textarea
              style={styles.textarea}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter card text..."
              autoFocus
            />
            <div style={styles.formButtons}>
              <button type="submit">Add Card</button>
              <button type="button" style={styles.cancelBtn} onClick={() => { setAdding(false); setContent('') }}>Cancel</button>
            </div>
          </form>
        ) : (
          <button style={styles.addBtn} onClick={() => setAdding(true)}>+ Add a card</button>
        )}
      </div>
    </div>
  )
}
