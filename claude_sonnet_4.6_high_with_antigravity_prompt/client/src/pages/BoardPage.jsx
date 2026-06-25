import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { io } from 'socket.io-client';
import GuestAuthModal from '../components/GuestAuthModal';
import Column from '../components/Column';

let socket = null;

function getSocket() {
  if (!socket) {
    socket = io({ transports: ['websocket', 'polling'] });
  }
  return socket;
}

export default function BoardPage() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authorName, setAuthorName] = useState(() => sessionStorage.getItem('retro_author') || '');
  const [selectedCard, setSelectedCard] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [addingColumn, setAddingColumn] = useState(false);

  // Fetch board data
  const fetchBoard = useCallback(() => {
    fetch(`/api/boards/${boardId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Board not found');
        return r.json();
      })
      .then((data) => { setBoard(data); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [boardId]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  // Socket.io real-time updates
  useEffect(() => {
    if (!authorName) return;
    const s = getSocket();

    s.emit('join_board', { boardId });

    s.on('card_added', (card) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === card.column_id
              ? { ...col, cards: [...col.cards.filter((c) => c.id !== card.id), { ...card, comments: [] }] }
              : col
          ),
        };
      });
    });

    s.on('card_moved', (updatedCard) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const withoutCard = prev.columns.map((col) => ({
          ...col,
          cards: col.cards.filter((c) => c.id !== updatedCard.id),
        }));
        return {
          ...prev,
          columns: withoutCard.map((col) =>
            col.id === updatedCard.column_id
              ? {
                  ...col,
                  cards: [
                    ...col.cards.slice(0, updatedCard.position),
                    { ...updatedCard, comments: [] },
                    ...col.cards.slice(updatedCard.position),
                  ],
                }
              : col
          ),
        };
      });
    });

    s.on('comment_added', (comment) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            cards: col.cards.map((card) =>
              card.id === comment.card_id
                ? { ...card, comments: [...(card.comments || []), comment] }
                : card
            ),
          })),
        };
      });
      setSelectedCard((prev) =>
        prev && prev.id === comment.card_id
          ? { ...prev, comments: [...(prev.comments || []), comment] }
          : prev
      );
    });

    s.on('column_added', (col) => {
      setBoard((prev) => prev ? { ...prev, columns: [...prev.columns, { ...col, cards: [] }] } : prev);
    });

    return () => {
      s.emit('leave_board', { boardId });
      s.off('card_added');
      s.off('card_moved');
      s.off('comment_added');
      s.off('column_added');
    };
  }, [boardId, authorName]);

  const handleJoin = (name) => {
    sessionStorage.setItem('retro_author', name);
    setAuthorName(name);
  };

  // Drag and drop
  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const s = getSocket();
    s.emit('move_card', {
      boardId,
      cardId: draggableId,
      newColumnId: destination.droppableId,
      newPosition: destination.index,
    });

    // Optimistic update
    setBoard((prev) => {
      if (!prev) return prev;
      let movedCard = null;
      const withoutCard = prev.columns.map((col) => {
        const filtered = col.cards.filter((c) => {
          if (c.id === draggableId) { movedCard = c; return false; }
          return true;
        });
        return { ...col, cards: filtered };
      });
      if (!movedCard) return prev;
      return {
        ...prev,
        columns: withoutCard.map((col) =>
          col.id === destination.droppableId
            ? {
                ...col,
                cards: [
                  ...col.cards.slice(0, destination.index),
                  { ...movedCard, column_id: destination.droppableId, position: destination.index },
                  ...col.cards.slice(destination.index),
                ],
              }
            : col
        ),
      };
    });
  };

  const handleAddCard = (columnId, content) => {
    return new Promise((resolve) => {
      const s = getSocket();
      s.emit('add_card', { boardId, columnId, content, authorName }, resolve);
    });
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedCard || addingComment) return;
    setAddingComment(true);
    const s = getSocket();
    s.emit('add_comment', { boardId, cardId: selectedCard.id, content: commentText.trim(), authorName }, () => {
      setCommentText('');
      setAddingComment(false);
    });
  };

  const handleAddColumn = async (e) => {
    e.preventDefault();
    if (!newColumnTitle.trim() || addingColumn) return;
    setAddingColumn(true);
    await fetch(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newColumnTitle.trim() }),
    });
    setNewColumnTitle('');
    setShowAddColumn(false);
    setAddingColumn(false);
  };

  const handleExport = () => {
    window.location.href = `/api/boards/${boardId}/export`;
  };

  // Sync selected card with latest board state
  const getLatestCard = () => {
    if (!selectedCard || !board) return selectedCard;
    for (const col of board.columns) {
      const found = col.cards.find((c) => c.id === selectedCard.id);
      if (found) return found;
    }
    return selectedCard;
  };

  const currentCard = getLatestCard();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Loading board…</span>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="loading-screen">
        <p style={{ color: 'var(--text-secondary)' }}>{error || 'Board not found'}</p>
        <Link to="/" className="btn btn-ghost">← Back to boards</Link>
      </div>
    );
  }

  return (
    <div className="board-page">
      {!authorName && <GuestAuthModal onJoin={handleJoin} />}

      <header className="board-header">
        <div className="board-header-left">
          <Link to="/" className="back-link" title="Back to boards">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </Link>
          <span className="board-title">{board.title}</span>
        </div>
        <div className="board-header-actions">
          {authorName && (
            <div className="user-badge" id="user-badge">
              <span className="user-badge-dot" />
              {authorName}
            </div>
          )}
          <button className="btn btn-ghost btn-sm" onClick={handleExport} id="export-csv-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>
      </header>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="board-columns-area">
          {board.columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              onAddCard={handleAddCard}
              onCardClick={(card) => setSelectedCard(card)}
            />
          ))}

          <div className="add-column-card">
            {showAddColumn ? (
              <form className="add-column-form" onSubmit={handleAddColumn}>
                <input
                  className="input"
                  placeholder="Column name…"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  autoFocus
                  id="new-column-input"
                  onKeyDown={(e) => e.key === 'Escape' && setShowAddColumn(false)}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={!newColumnTitle.trim() || addingColumn}>
                    Add
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowAddColumn(false); setNewColumnTitle(''); }}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button className="add-column-btn" onClick={() => setShowAddColumn(true)} id="add-column-btn">
                <span>+</span> Add Column
              </button>
            )}
          </div>
        </div>
      </DragDropContext>

      {/* Card Detail Modal */}
      {selectedCard && currentCard && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedCard(null)}>
          <div className="modal" id="card-detail-modal">
            <div className="modal-header">
              <div className="modal-title">{currentCard.content}</div>
              <button className="modal-close" onClick={() => setSelectedCard(null)} id="close-card-modal">×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 20 }}>
                Added by <strong style={{ color: 'var(--accent-1)' }}>{currentCard.author_name}</strong>
              </p>
              <div className="comments-section-title">Comments ({(currentCard.comments || []).length})</div>
              <div className="comments-list">
                {(currentCard.comments || []).length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No comments yet. Be the first!</p>
                ) : (
                  (currentCard.comments || []).map((c) => (
                    <div key={c.id} className="comment" id={`comment-${c.id}`}>
                      <div className="comment-header">
                        <span className="comment-author">{c.author_name}</span>
                        <span className="comment-date">{new Date(c.created_at).toLocaleTimeString()}</span>
                      </div>
                      <div className="comment-content">{c.content}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="modal-footer">
              {authorName ? (
                <form className="add-comment-form" onSubmit={handleAddComment}>
                  <input
                    className="input add-comment-input"
                    placeholder="Add a comment…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    id="comment-input"
                    disabled={addingComment}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={!commentText.trim() || addingComment}
                    id="submit-comment-btn"
                  >
                    {addingComment ? '…' : 'Post'}
                  </button>
                </form>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Join the board to comment.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
