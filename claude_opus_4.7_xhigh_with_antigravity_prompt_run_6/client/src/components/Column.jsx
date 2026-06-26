import { Droppable } from '@hello-pangea/dnd';
import Card from './Card.jsx';
import AddCard from './AddCard.jsx';

const ACCENT_PALETTE = [
  '#34d399',
  '#fb7185',
  '#fbbf24',
  '#a78bfa',
  '#67e8f9',
  '#f472b6',
  '#818cf8',
  '#fb923c'
];

export default function Column({ column, index, onAddCard, onOpenComments, flashingCards }) {
  const accent = ACCENT_PALETTE[index % ACCENT_PALETTE.length];
  return (
    <section className="column" aria-label={`${column.title} column`} id={`column-${column.id}`}>
      <header className="column-header">
        <h2>
          <span className="accent" style={{ background: accent }} aria-hidden="true" />
          {column.title}
        </h2>
        <span className="count-chip" aria-label={`${column.cards.length} cards`}>
          {column.cards.length}
        </span>
      </header>

      <Droppable droppableId={column.id} type="CARD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`cards-scroll ${snapshot.isDraggingOver ? 'is-dragging-over' : ''}`}
          >
            {column.cards.length === 0 && !snapshot.isDraggingOver && (
              <div className="empty-column">No cards yet. Add one below.</div>
            )}
            {column.cards.map((card, idx) => (
              <Card
                key={card.id}
                card={card}
                index={idx}
                isFlashing={flashingCards.has(card.id)}
                onOpenComments={onOpenComments}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <AddCard columnId={column.id} onSubmit={(text) => onAddCard(column.id, text)} />
    </section>
  );
}
