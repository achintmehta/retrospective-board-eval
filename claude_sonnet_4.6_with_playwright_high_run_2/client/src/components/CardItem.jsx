import { Draggable } from '@hello-pangea/dnd';

export default function CardItem({ card, index, onClick, commentCount }) {
  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          style={{
            background: '#fff',
            borderRadius: 6,
            padding: '0.5rem 0.75rem',
            marginBottom: '0.5rem',
            boxShadow: snapshot.isDragging
              ? '0 4px 14px rgba(0,0,0,0.15)'
              : '0 1px 3px rgba(0,0,0,0.08)',
            cursor: 'pointer',
            userSelect: 'none',
            ...provided.draggableProps.style,
          }}
        >
          <p style={{ fontSize: '0.875rem', marginBottom: '0.375rem', lineHeight: 1.4 }}>
            {card.content}
          </p>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#aaa',
            fontSize: '0.75rem',
          }}>
            <span>{card.author_name}</span>
            {commentCount > 0 && (
              <span style={{ color: '#777' }}>💬 {commentCount}</span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
