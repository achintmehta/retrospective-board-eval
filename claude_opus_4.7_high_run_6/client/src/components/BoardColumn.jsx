import { Droppable } from '@hello-pangea/dnd';
import BoardCard from './BoardCard.jsx';
import AddCardForm from './AddCardForm.jsx';

export default function BoardColumn({
  column,
  cards,
  commentsByCard,
  onAddCard,
  onAddComment,
}) {
  return (
    <div className="board-column">
      <header className="column-header">
        <h3>{column.title}</h3>
        <span className="column-count">{cards.length}</span>
      </header>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column-cards${snapshot.isDraggingOver ? ' drag-over' : ''}`}
          >
            {cards.map((card, idx) => (
              <BoardCard
                key={card.id}
                card={card}
                index={idx}
                comments={commentsByCard[card.id] || []}
                onAddComment={onAddComment}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <AddCardForm onAdd={(content) => onAddCard(column.id, content)} />
    </div>
  );
}
