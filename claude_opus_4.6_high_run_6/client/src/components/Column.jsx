import { Droppable, Draggable } from '@hello-pangea/dnd'
import CardItem from './CardItem'
import AddCardForm from './AddCardForm'

function Column({ column, onAddCard, onAddComment }) {
  return (
    <div style={{
      background: '#e8ecf1', borderRadius: 8, padding: 12,
      width: 300, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 8,
      maxHeight: 'calc(100vh - 140px)'
    }}>
      <h3 style={{ fontSize: 15, color: '#1a1a2e', paddingBottom: 8, borderBottom: '2px solid #4a90d9' }}>
        {column.title}
      </h3>

      <Droppable droppableId={String(column.id)}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 40 }}
          >
            {column.cards.map((card, index) => (
              <Draggable key={card.id} draggableId={String(card.id)} index={index}>
                {(provided) => (
                  <CardItem
                    card={card}
                    provided={provided}
                    onAddComment={onAddComment}
                  />
                )}
              </Draggable>
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
