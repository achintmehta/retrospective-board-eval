import { Droppable } from '@hello-pangea/dnd'
import Card from './Card'
import AddCardForm from './AddCardForm'
import './Column.css'

function Column({ column, onAddCard, onAddComment }) {
  return (
    <div className="column">
      <h3 className="column-title">{column.title}</h3>
      <Droppable droppableId={String(column.id)}>
        {(provided, snapshot) => (
          <div
            className={`column-cards ${snapshot.isDraggingOver ? 'column-drag-over' : ''}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {(column.cards || []).map((card, index) => (
              <Card
                key={card.id}
                card={card}
                index={index}
                onAddComment={onAddComment}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <AddCardForm onAdd={(content) => onAddCard(column.id, content)} />
    </div>
  )
}

export default Column
