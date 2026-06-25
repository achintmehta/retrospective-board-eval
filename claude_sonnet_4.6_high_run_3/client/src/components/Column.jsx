import { useState } from 'react'
import { Droppable } from '@hello-pangea/dnd'
import Card from './Card.jsx'

export default function Column({ column, authorName, socket, boardId }) {
  const [newCardText, setNewCardText] = useState('')
  const [adding, setAdding] = useState(false)

  function handleAddCard(e) {
    e.preventDefault()
    const text = newCardText.trim()
    if (!text) return
    socket.emit('add_card', {
      boardId,
      columnId: column.id,
      content: text,
      authorName,
    })
    setNewCardText('')
    setAdding(false)
  }

  return (
    <div style={{
      background: '#ebecf0',
      borderRadius: 10,
      padding: '12px 10px',
      width: 280,
      minWidth: 280,
      maxHeight: 'calc(100vh - 120px)',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, padding: '0 4px' }}>
        {column.title}
        <span style={{
          fontSize: 12, fontWeight: 400, color: 'var(--text-muted)',
          marginLeft: 6,
        }}>
          {column.cards.length}
        </span>
      </h3>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              minHeight: 4,
              background: snapshot.isDraggingOver ? 'rgba(79,70,229,0.08)' : 'transparent',
              borderRadius: 6,
              transition: 'background 0.15s',
              flex: 1,
            }}
          >
            {column.cards.map((card, index) => (
              <Card
                key={card.id}
                card={card}
                index={index}
                authorName={authorName}
                socket={socket}
                boardId={boardId}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {adding ? (
        <form onSubmit={handleAddCard} style={{ marginTop: 8 }}>
          <textarea
            autoFocus
            placeholder="Card content…"
            value={newCardText}
            onChange={(e) => setNewCardText(e.target.value)}
            style={{ marginBottom: 8, fontSize: 13 }}
            onKeyDown={(e) => { if (e.key === 'Escape') setAdding(false) }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="submit"
              disabled={!newCardText.trim()}
              style={{ background: 'var(--primary)', color: '#fff', flex: 1 }}
            >
              Add Card
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            marginTop: 8, background: 'transparent',
            color: 'var(--text-muted)', textAlign: 'left',
            padding: '8px 4px', fontSize: 13,
          }}
        >
          + Add a card
        </button>
      )}
    </div>
  )
}
