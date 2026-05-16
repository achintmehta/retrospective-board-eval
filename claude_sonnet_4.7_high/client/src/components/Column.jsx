import { useState } from 'react'
import { Droppable, Draggable } from '@hello-pangea/dnd'
import CardItem from './CardItem'

export default function Column({ column, authorName, onAddCard, onOpenComments }) {
  const [text, setText] = useState('')
  const [adding, setAdding] = useState(false)

  function handleAdd(e) {
    e.preventDefault()
    if (!text.trim()) return
    onAddCard(column.id, text.trim())
    setText('')
    setAdding(false)
  }

  return (
    <div className="column">
      <h3 className="column-title">{column.title}</h3>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`card-list${snapshot.isDraggingOver ? ' drag-over' : ''}`}
          >
            {column.cards.map((card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(provided, snapshot) => (
                  <CardItem
                    card={card}
                    provided={provided}
                    isDragging={snapshot.isDragging}
                    onOpenComments={onOpenComments}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <div className="add-card-section">
        {adding ? (
          <form onSubmit={handleAdd} className="add-card-form">
            <textarea
              placeholder="Card content..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
              rows={3}
            />
            <div className="form-actions">
              <button type="submit" disabled={!text.trim()}>Add Card</button>
              <button type="button" onClick={() => { setAdding(false); setText('') }}>Cancel</button>
            </div>
          </form>
        ) : (
          <button className="add-card-btn" onClick={() => setAdding(true)}>
            + Add Card
          </button>
        )}
      </div>
    </div>
  )
}
