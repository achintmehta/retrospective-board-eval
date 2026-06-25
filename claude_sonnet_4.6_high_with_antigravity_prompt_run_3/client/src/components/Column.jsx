import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import Card from './Card';

const COLUMN_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4'];

export default function Column({ column, index: colIndex, onAddCard, onOpenComments }) {
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const color = COLUMN_COLORS[colIndex % COLUMN_COLORS.length];

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    await onAddCard(column.id, content.trim());
    setContent('');
    setShowForm(false);
    setSubmitting(false);
  };

  return (
    <div className="column" id={`column-${column.id}`}>
      <div className="column-header">
        <div className="column-title-row">
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: color,
              display: 'inline-block',
              flexShrink: 0,
              boxShadow: `0 0 6px ${color}80`
            }}
          />
          <span className="column-title">{column.title}</span>
          <span className="column-count">{column.cards?.length ?? 0}</span>
        </div>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column-cards${snapshot.isDraggingOver ? ' column-cards-drop' : ''}`}
          >
            {(column.cards || []).map((card, i) => (
              <Card
                key={card.id}
                card={card}
                index={i}
                onOpenComments={onOpenComments}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <div className="column-add-card">
        {!showForm ? (
          <button
            className="add-card-toggle"
            onClick={() => setShowForm(true)}
            id={`add-card-btn-${column.id}`}
          >
            + Add card
          </button>
        ) : (
          <form className="add-card-form" onSubmit={handleAddCard}>
            <textarea
              className="form-textarea"
              placeholder="What's on your mind?"
              value={content}
              onChange={e => setContent(e.target.value)}
              autoFocus
              style={{ minHeight: 70 }}
            />
            <div className="add-card-actions">
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!content.trim() || submitting}
                id={`submit-card-btn-${column.id}`}
              >
                {submitting ? '...' : 'Add'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => { setShowForm(false); setContent(''); }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
