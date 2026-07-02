import { Droppable } from '@hello-pangea/dnd';
import Card from './Card.jsx';
import AddCardForm from './AddCardForm.jsx';

export default function Column({ column, onAddCard, onOpenCard }) {
  return (
    <div className="column">
      <div className="column__head">
        <h3 className="column__title">{column.title}</h3>
        <span className="column__count">{column.cards.length}</span>
      </div>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column__body ${snapshot.isDraggingOver ? 'column__body--drop' : ''}`}
          >
            {column.cards.map((card, index) => (
              <Card key={card.id} card={card} index={index} onOpen={onOpenCard} />
            ))}
            {provided.placeholder}
            {column.cards.length === 0 && !snapshot.isDraggingOver && (
              <div className="column__empty">Drag a card here or add one below</div>
            )}
          </div>
        )}
      </Droppable>
      <AddCardForm onSubmit={(content) => onAddCard(column.id, content)} />
    </div>
  );
}
