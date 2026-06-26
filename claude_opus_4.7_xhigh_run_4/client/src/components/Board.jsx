import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import AddCardForm from './AddCardForm.jsx';

function CommentBadge({ count }) {
  if (!count) return null;
  return (
    <span className="comment-count" title={`${count} comment${count === 1 ? '' : 's'}`}>
      💬 {count}
    </span>
  );
}

export default function Board({ board, onAddCard, onMoveCard, onAddColumn, onOpenCard }) {
  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }
    onMoveCard({
      cardId: draggableId,
      sourceColumnId: source.droppableId,
      targetColumnId: destination.droppableId,
      targetIndex: destination.index,
    });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="board-body">
        {board.columns.map((column) => (
          <div key={column.id} className="column">
            <div className="column-header">
              <span>{column.title}</span>
              <span className="card-count">{column.cards.length}</span>
            </div>
            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`column-cards${snapshot.isDraggingOver ? ' dragging-over' : ''}`}
                >
                  {column.cards.map((card, index) => (
                    <Draggable key={card.id} draggableId={card.id} index={index}>
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className={`card${dragSnapshot.isDragging ? ' dragging' : ''}`}
                          onClick={() => onOpenCard(card.id)}
                        >
                          <div className="card-content">{card.content}</div>
                          <div className="card-meta">
                            <span className="author-pill">{card.author_name}</span>
                            <CommentBadge count={card.comments?.length || 0} />
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
            <div className="column-footer">
              <AddCardForm onAdd={(content) => onAddCard(column.id, content)} />
            </div>
          </div>
        ))}
        <AddColumn onAdd={onAddColumn} />
      </div>
    </DragDropContext>
  );
}

function AddColumn({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e?.preventDefault?.();
    const text = value.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      await onAdd(text);
      setValue('');
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <div className="add-column">
        <button type="button" className="add-card-button" onClick={() => setOpen(true)}>
          + Add column
        </button>
      </div>
    );
  }

  return (
    <form className="add-column" onSubmit={submit}>
      <input
        className="input"
        autoFocus
        value={value}
        maxLength={100}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
            setValue('');
          }
        }}
        placeholder="Column name"
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="submit" className="btn btn-sm" disabled={submitting || !value.trim()}>
          {submitting ? 'Adding…' : 'Add'}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setOpen(false);
            setValue('');
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
