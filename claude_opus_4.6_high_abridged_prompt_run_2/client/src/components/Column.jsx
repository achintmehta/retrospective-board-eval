import { useState } from 'react'
import { Droppable, Draggable } from '@hello-pangea/dnd'
import styles from './Column.module.css'

export default function Column({ column, onAddCard, onSelectCard }) {
  const [newContent, setNewContent] = useState('')
  const [adding, setAdding] = useState(false)

  function handleAdd(e) {
    e.preventDefault()
    if (!newContent.trim()) return
    onAddCard(column.id, newContent.trim())
    setNewContent('')
    setAdding(false)
  }

  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>
        <h3 className={styles.columnTitle}>{column.title}</h3>
        <span className={styles.cardCount}>{column.cards.length}</span>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            className={`${styles.cardList} ${snapshot.isDraggingOver ? styles.dragOver : ''}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {column.cards.map((card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    className={`${styles.card} ${snapshot.isDragging ? styles.dragging : ''}`}
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => onSelectCard(card)}
                  >
                    <p className={styles.cardContent}>{card.content}</p>
                    <div className={styles.cardMeta}>
                      <span className={styles.author}>{card.author_name}</span>
                      {card.comments.length > 0 && (
                        <span className={styles.commentCount}>
                          &#128172; {card.comments.length}
                        </span>
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

      {adding ? (
        <form className={styles.addForm} onSubmit={handleAdd}>
          <textarea
            className={styles.addInput}
            placeholder="Write something..."
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            autoFocus
            rows={3}
          />
          <div className={styles.addActions}>
            <button className={styles.addBtn} type="submit" disabled={!newContent.trim()}>
              Add
            </button>
            <button
              className={styles.cancelBtn}
              type="button"
              onClick={() => { setAdding(false); setNewContent('') }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button className={styles.addTrigger} onClick={() => setAdding(true)}>
          + Add a card
        </button>
      )}
    </div>
  )
}
