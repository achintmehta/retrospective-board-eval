import { forwardRef, useState } from 'react';

const Column = forwardRef(function Column(
  {
    column,
    onAddCard,
    onOpenCard,
    renderCard,
    droppableProps,
    placeholder,
    isDraggingOver
  },
  ref
) {
  const [content, setContent] = useState('');
  const [adding, setAdding] = useState(false);

  function submit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    onAddCard(content);
    setContent('');
    setAdding(false);
  }

  return (
    <section className={`column ${isDraggingOver ? 'column-drag-over' : ''}`}>
      <header className="column-header">
        <h3 className="column-title">{column.title}</h3>
        <span className="column-count">{column.cards.length}</span>
      </header>

      <div
        ref={ref}
        {...droppableProps}
        className="column-cards"
      >
        {column.cards.length === 0 && !isDraggingOver && (
          <div className="column-empty">Drop cards here or add one below</div>
        )}
        {column.cards.map((card, index) => renderCard(card, index))}
        {placeholder}
      </div>

      {adding ? (
        <form className="column-add-form" onSubmit={submit}>
          <textarea
            autoFocus
            className="text-input textarea"
            placeholder="What went well? What could improve?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
              if (e.key === 'Escape') {
                setContent('');
                setAdding(false);
              }
            }}
          />
          <div className="column-add-actions">
            <button type="submit" className="btn btn-primary btn-sm" disabled={!content.trim()}>
              Add card
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setContent('');
                setAdding(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="column-add-btn" onClick={() => setAdding(true)}>
          + Add a card
        </button>
      )}
    </section>
  );
});

export default Column;
