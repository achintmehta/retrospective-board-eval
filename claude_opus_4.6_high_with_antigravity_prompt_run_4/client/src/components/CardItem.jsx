import './CardItem.css';

export default function CardItem({ card, isDragging, onClick }) {
  return (
    <div
      className={`card-item ${isDragging ? 'dragging' : ''}`}
      onClick={onClick}
      id={`card-${card.id}`}
    >
      <p className="card-content">{card.content}</p>
      <div className="card-meta">
        <span className="card-author">{card.author_name}</span>
        {card.comments && card.comments.length > 0 && (
          <span className="card-comment-count">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            {card.comments.length}
          </span>
        )}
      </div>
    </div>
  );
}
