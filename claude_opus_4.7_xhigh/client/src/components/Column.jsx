import { Droppable } from '@hello-pangea/dnd';
import Card from './Card.jsx';
import AddCardForm from './AddCardForm.jsx';

export default function Column({ column }) {
  return (
    <section className="column">
      <header className="column-header">
        <h3>{column.title}</h3>
        <span className="muted small">{column.cards.length}</span>
      </header>
      <Droppable droppableId={`column-${column.id}`} type="CARD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column-cards ${snapshot.isDraggingOver ? 'column-cards--over' : ''}`}
          >
            {column.cards.map((card, index) => (
              <Card key={card.id} card={card} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <AddCardForm columnId={column.id} />
    </section>
  );
}
