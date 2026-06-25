import { useState } from 'react'
import { Droppable, Draggable } from '@hello-pangea/dnd'

export default function Column({ column, onAddCard, onCardClick }) {
  const [content, setContent] = useState('')

  const handleAdd = (e) => {
    e.preventDefault()
    if (!content.trim()) return
    onAddCard(column.id, content.trim())
    setContent('')
  }

  return (
    <div className="column">
      <h2 className="column-title">{column.title}</h2>
      <Droppable droppableId={column.id}>
        {(provided) => (
          <div
            className="card-list"
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {column.cards.map((card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    className={`card ${snapshot.isDragging ? 'dragging' : ''}`}
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => onCardClick(card)}
                  >
                    <p className="card-content">{card.content}</p>
                    <div className="card-meta">
                      <span className="card-author">{card.author_name}</span>
                      {card.comments.length > 0 && (
                        <span className="card-comments">{card.comments.length} comment{card.comments.length !== 1 ? 's' : ''}</span>
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
      <form onSubmit={handleAdd} className="add-card-form">
        <input
          type="text"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Add a card..."
        />
        <button type="submit">+</button>
      </form>
    </div>
  )
}
