import { useState } from 'react'
import { Droppable } from '@hello-pangea/dnd'
import Card from './Card'

const COLUMN_COLORS = [
  '#6c63ff',
  '#38b2ac',
  '#f06292',
  '#fbbf24',
  '#9f7aea',
]

export default function Column({ column, colorIndex, onAddCard, onOpenComments }) {
  const [showForm, setShowForm] = useState(false)
  const [cardText, setCardText] = useState('')
  const color = COLUMN_COLORS[colorIndex % COLUMN_COLORS.length]

  function handleAddCard(e) {
    e.preventDefault()
    if (!cardText.trim()) return
    onAddCard(column.id, cardText.trim())
    setCardText('')
    setShowForm(false)
  }

  return (
    <div className="column" id={`column-${column.id}`}>
      <div className="column-header">
        <div className="column-title">
          <div className="column-color-dot" style={{ background: color }} />
          {column.title}
          <span className="column-count">{column.cards?.length ?? 0}</span>
        </div>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            className={`column-cards column-drop-zone${snapshot.isDraggingOver ? ' is-over' : ''}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {(column.cards ?? []).map((card, index) => (
              <Card
                key={card.id}
                card={card}
                index={index}
                onOpenComments={onOpenComments}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <div className="column-footer">
        {showForm ? (
          <form className="add-card-form" onSubmit={handleAddCard} id={`add-card-form-${column.id}`}>
            <textarea
              id={`card-text-${column.id}`}
              className="input"
              placeholder="What's on your mind?"
              value={cardText}
              onChange={e => setCardText(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Escape') { setShowForm(false); setCardText('') } }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary btn-sm" id={`submit-card-${column.id}`} disabled={!cardText.trim()}>
                Add Card
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setCardText('') }}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            id={`add-card-btn-${column.id}`}
            className="add-card-btn"
            onClick={() => setShowForm(true)}
          >
            + Add a card
          </button>
        )}
      </div>
    </div>
  )
}
