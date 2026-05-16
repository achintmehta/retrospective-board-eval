import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './BoardPage.css';

const COLUMN_COLORS = ['#7c3aed', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
const SOCKET_URL = window.location.origin;

export default function BoardPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();

  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState(() => sessionStorage.getItem(`retro_name_${boardId}`) || '');
  const [showAuthModal, setShowAuthModal] = useState(!sessionStorage.getItem(`retro_name_${boardId}`));
  const [nameInput, setNameInput] = useState('');

  const [selectedCardId, setSelectedCardId] = useState(null);
  const [commentInput, setCommentInput] = useState('');

  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [addingColumn, setAddingColumn] = useState(false);
  const [cardInputs, setCardInputs] = useState({});
  const [activeCardInput, setActiveCardInput] = useState(null);

  const socketRef = useRef(null);

  // Derive selected card from live board state (always fresh)
  const selectedCard = selectedCardId
    ? board?.columns.flatMap(c => c.cards).find(c => c.id === selectedCardId) ?? null
    : null;

  // Fetch board data
  useEffect(() => {
    fetch(`/api/boards/${boardId}`)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then(data => { setBoard(data); setLoading(false); })
      .catch(() => { setLoading(false); navigate('/'); });
  }, [boardId, navigate]);

  // Socket.io setup
  useEffect(() => {
    const socket = io(SOCKET_URL, { path: '/socket.io', transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('card_added', card => {
      setBoard(prev => !prev ? prev : {
        ...prev,
        columns: prev.columns.map(col =>
          col.id === card.column_id
            ? { ...col, cards: [...col.cards, { ...card, comments: [] }] }
            : col
        )
      });
    });

    socket.on('card_moved', ({ cardId, newColumnId, newPosition }) => {
      setBoard(prev => {
        if (!prev) return prev;
        let movedCard = null;
        const cols = prev.columns.map(col => {
          const idx = col.cards.findIndex(c => c.id === cardId);
          if (idx !== -1) {
            movedCard = col.cards[idx];
            return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
          }
          return col;
        });
        if (!movedCard) return prev;
        movedCard = { ...movedCard, column_id: newColumnId };
        return {
          ...prev,
          columns: cols.map(col => {
            if (col.id !== newColumnId) return col;
            const cards = [...col.cards];
            cards.splice(newPosition, 0, movedCard);
            return { ...col, cards };
          })
        };
      });
    });

    socket.on('comment_added', ({ cardId, comment }) => {
      setBoard(prev => !prev ? prev : {
        ...prev,
        columns: prev.columns.map(col => ({
          ...col,
          cards: col.cards.map(card =>
            card.id === cardId ? { ...card, comments: [...card.comments, comment] } : card
          )
        }))
      });
    });

    socket.on('column_added', column => {
      setBoard(prev => prev ? { ...prev, columns: [...prev.columns, { ...column, cards: [] }] } : prev);
    });

    return () => { socket.disconnect(); };
  }, [boardId]);

  // Join board room when displayName is available
  useEffect(() => {
    if (displayName && socketRef.current?.connected) {
      socketRef.current.emit('join_board', { boardId, displayName });
    }
    if (displayName && socketRef.current) {
      socketRef.current.on('connect', () => {
        socketRef.current.emit('join_board', { boardId, displayName });
      });
    }
  }, [displayName, boardId]);

  function joinBoard(e) {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    sessionStorage.setItem(`retro_name_${boardId}`, name);
    setDisplayName(name);
    setShowAuthModal(false);
    socketRef.current?.emit('join_board', { boardId, displayName: name });
  }

  function handleDragEnd({ source, destination, draggableId }) {
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Optimistic update
    setBoard(prev => {
      if (!prev) return prev;
      let movedCard = null;
      const cols = prev.columns.map(col => {
        if (col.id === source.droppableId) {
          movedCard = col.cards[source.index];
          return { ...col, cards: col.cards.filter((_, i) => i !== source.index) };
        }
        return col;
      });
      if (!movedCard) return prev;
      return {
        ...prev,
        columns: cols.map(col => {
          if (col.id !== destination.droppableId) return col;
          const cards = [...col.cards];
          cards.splice(destination.index, 0, { ...movedCard, column_id: destination.droppableId });
          return { ...col, cards };
        })
      };
    });

    socketRef.current?.emit('move_card', {
      cardId: draggableId,
      newColumnId: destination.droppableId,
      newPosition: destination.index,
    });
  }

  function submitCard(columnId) {
    const content = (cardInputs[columnId] || '').trim();
    if (!content) return;
    socketRef.current?.emit('add_card', { columnId, content });
    setCardInputs(prev => ({ ...prev, [columnId]: '' }));
    setActiveCardInput(null);
  }

  async function addColumn(e) {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;
    setAddingColumn(true);
    try {
      await fetch(`/api/boards/${boardId}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newColumnTitle.trim() }),
      });
      setNewColumnTitle('');
      setShowAddColumn(false);
    } finally {
      setAddingColumn(false);
    }
  }

  function submitComment(e) {
    e.preventDefault();
    const content = commentInput.trim();
    if (!content || !selectedCard) return;
    socketRef.current?.emit('add_comment', { cardId: selectedCard.id, content });
    setCommentInput('');
  }

  if (loading) {
    return (
      <div className="board-loading">
        <div className="spinner" />
        <p>Loading board…</p>
      </div>
    );
  }

  if (!board) return null;

  return (
    <div className="board-page">
      {/* Guest Auth Modal */}
      {showAuthModal && (
        <div className="modal-overlay">
          <div className="modal-box scale-in" id="auth-modal">
            <div className="auth-logo">
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                <rect width="44" height="44" rx="14" fill="url(#authlg)" />
                <path d="M11 15h22M11 22h16M11 29h11" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                <defs>
                  <linearGradient id="authlg" x1="0" y1="0" x2="44" y2="44">
                    <stop stopColor="#7c3aed" />
                    <stop offset="1" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h2 className="auth-title">Join the board</h2>
            <p className="auth-subtitle">
              Enter your display name to collaborate on<br />
              <strong style={{ color: 'var(--text-primary)' }}>{board.title}</strong>
            </p>
            <form onSubmit={joinBoard} id="auth-form">
              <input
                id="display-name-input"
                type="text"
                placeholder="Your name (e.g. Alex)"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                maxLength={40}
                autoFocus
                style={{ marginBottom: 16 }}
              />
              <button
                id="join-board-btn"
                type="submit"
                className="btn btn-primary"
                disabled={!nameInput.trim()}
                style={{ width: '100%', justifyContent: 'center', padding: '12px 24px' }}
              >
                Join Board →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {selectedCard && (
        <div
          className="modal-overlay"
          id="comment-modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setSelectedCardId(null); }}
        >
          <div className="modal-box comment-modal scale-in" id="comment-modal">
            <div className="comment-modal-header">
              <div className="comment-card-info">
                <span className="comment-card-author">by {selectedCard.author_name}</span>
                <p className="comment-card-text">{selectedCard.content}</p>
              </div>
              <button id="close-comment-modal" className="btn btn-icon" onClick={() => setSelectedCardId(null)}>✕</button>
            </div>

            <div className="comments-list" id="comments-list">
              {selectedCard.comments.length === 0 ? (
                <p className="no-comments">No comments yet — start the discussion!</p>
              ) : (
                selectedCard.comments.map((c, i) => (
                  <div key={c.id || i} className="comment-item">
                    <div className="comment-item-meta">
                      <span className="comment-item-author">{c.author_name}</span>
                      <span className="comment-item-time">
                        {c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="comment-item-content">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            {displayName ? (
              <form onSubmit={submitComment} className="comment-form" id="comment-form">
                <textarea
                  id="comment-input"
                  placeholder="Add a comment… (Enter to send)"
                  value={commentInput}
                  onChange={e => setCommentInput(e.target.value)}
                  rows={2}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(e); } }}
                />
                <button
                  id="submit-comment-btn"
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={!commentInput.trim()}
                >
                  Send
                </button>
              </form>
            ) : (
              <p className="comment-join-prompt">Join the board to add comments</p>
            )}
          </div>
        </div>
      )}

      {/* Board Header */}
      <header className="board-header">
        <div className="board-header-inner">
          <div className="board-header-left">
            <button id="back-home-btn" className="btn btn-icon" onClick={() => navigate('/')} title="Back">
              ←
            </button>
            <div className="board-title-group">
              <h1 className="board-name">{board.title}</h1>
              {displayName && (
                <span className="board-user-chip">
                  <span className="user-dot" />
                  {displayName}
                </span>
              )}
            </div>
          </div>
          <div className="board-header-actions">
            <button
              id="add-column-btn"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowAddColumn(v => !v)}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              Column
            </button>
            <button
              id="export-csv-btn"
              className="btn btn-ghost btn-sm"
              onClick={() => window.open(`/api/boards/${boardId}/export`, '_blank')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v7m0 0L4.5 6.5M7 9l2.5-2.5M2 11h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {showAddColumn && (
          <form onSubmit={addColumn} className="add-column-bar" id="add-column-form">
            <input
              id="new-column-title-input"
              type="text"
              placeholder="Column title…"
              value={newColumnTitle}
              onChange={e => setNewColumnTitle(e.target.value)}
              autoFocus
              maxLength={50}
              style={{ maxWidth: 280 }}
            />
            <button id="save-column-btn" type="submit" className="btn btn-primary btn-sm" disabled={addingColumn || !newColumnTitle.trim()}>
              Add Column
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddColumn(false)}>
              Cancel
            </button>
          </form>
        )}
      </header>

      {/* Board columns */}
      <main className="board-main">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="columns-container" id="columns-container">
            {board.columns.map((col, colIdx) => (
              <div
                key={col.id}
                className="column-wrapper animate-in"
                style={{
                  animationDelay: `${colIdx * 0.06}s`,
                  '--col-color': COLUMN_COLORS[colIdx % COLUMN_COLORS.length]
                }}
              >
                <div className="column" id={`column-${col.id}`}>
                  <div className="column-header">
                    <div className="column-header-left">
                      <span className="column-dot" />
                      <h2 className="column-title">{col.title}</h2>
                    </div>
                    <span className="column-count">{col.cards.length}</span>
                  </div>

                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`column-cards ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                      >
                        {col.cards.map((card, cardIdx) => (
                          <Draggable key={card.id} draggableId={card.id} index={cardIdx}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                id={`card-${card.id}`}
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className={`card ${dragSnapshot.isDragging ? 'card-dragging' : ''}`}
                                onClick={() => setSelectedCardId(card.id)}
                              >
                                <p className="card-content">{card.content}</p>
                                <div className="card-footer">
                                  <span className="card-author">{card.author_name}</span>
                                  {card.comments.length > 0 && (
                                    <span className="card-comment-count">
                                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <path d="M10 1H2a1 1 0 00-1 1v6a1 1 0 001 1h1l2 2 2-2h3a1 1 0 001-1V2a1 1 0 00-1-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                                      </svg>
                                      {card.comments.length}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>

                  {displayName && (
                    <div className="add-card-area">
                      {activeCardInput === col.id ? (
                        <div className="add-card-form" id={`add-card-form-${col.id}`}>
                          <textarea
                            id={`card-input-${col.id}`}
                            placeholder="What's on your mind?"
                            value={cardInputs[col.id] || ''}
                            onChange={e => setCardInputs(prev => ({ ...prev, [col.id]: e.target.value }))}
                            autoFocus
                            rows={3}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitCard(col.id); }
                              if (e.key === 'Escape') setActiveCardInput(null);
                            }}
                          />
                          <div className="add-card-actions">
                            <button
                              id={`submit-card-btn-${col.id}`}
                              className="btn btn-primary btn-sm"
                              onClick={() => submitCard(col.id)}
                              disabled={!(cardInputs[col.id] || '').trim()}
                            >
                              Add Card
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setActiveCardInput(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          id={`open-add-card-${col.id}`}
                          className="add-card-btn"
                          onClick={() => setActiveCardInput(col.id)}
                        >
                          + Add a card
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {board.columns.length === 0 && (
              <div className="no-columns-state">
                <p>No columns yet.</p>
                <p>Click "+ Column" in the header to add one.</p>
              </div>
            )}
          </div>
        </DragDropContext>
      </main>
    </div>
  );
}
