import { useState } from 'react'
import { Droppable, Draggable } from '@hello-pangea/dnd'
import Card from './Card'

const styles = {
  column: {
    background: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    minWidth: 280,
    maxWidth: 320,
    flex: '0 0 300px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 160px)',
  },
  header: {
    fontWeight: 700,
    fontSize: 16,
    marginBottom: 12,
    color: '#1a1a2e',
    padding: '0 4px',
  },
  cardList: {
    flex: 1,
    overflowY: 'auto',
    minHeight: 60,
  },
  addForm: {
    marginTop: 8,
  },
  textarea: {
    width: '100%',
    padding: 8,
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: 14,
    resize: 'vertical',
    minHeight: 60,
  },
  addBtnRow: {
    display: 'flex',
    gap: 8,
    marginTop: 8,
  },
  addBtn: {
    padding: '6px 16px',
    background: '#646cff',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
  },
  cancelBtn: {
    padding: '6px 16px',
    background: 'transparent',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: 14,
  },
  addCardToggle: {
    width: '100%',
    padding: 8,
    background: 'transparent',
    border: 'none',
    color: '#666',
    fontSize: 14,
    textAlign: 'left',
    marginTop: 8,
  },
}

export default function Column({ column, onAddCard, onOpenComments }) {
  const [adding, setAdding] = useState(false)
  const [content, setContent] = useState('')

  function handleAdd(e) {
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
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={styles.cardList}
          >
            {(column.cards || []).map((card, index) => (
              <Draggable key={card.id} draggableId={String(card.id)} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <Card card={card} onOpenComments={onOpenComments} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {adding ? (
        <form style={styles.addForm} onSubmit={handleAdd}>
          <textarea
            style={styles.textarea}
            placeholder="Enter card content..."
            value={content}
            onChange={e => setContent(e.target.value)}
            autoFocus
          />
          <div style={styles.addBtnRow}>
            <button type="submit" style={styles.addBtn}>Add</button>
            <button type="button" style={styles.cancelBtn} onClick={() => { setAdding(false); setContent('') }}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button style={styles.addCardToggle} onClick={() => setAdding(true)}>
          + Add a card
        </button>
      )}
    </div>
  )
}
