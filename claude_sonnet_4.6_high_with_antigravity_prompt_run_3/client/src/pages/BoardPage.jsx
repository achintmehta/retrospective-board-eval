import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { io } from 'socket.io-client';
import GuestAuthModal from '../components/GuestAuthModal';
import Column from '../components/Column';

const STORAGE_KEY = 'retro_display_name';

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function CommentDrawer({ card, boardId, authorName, socket, onClose, onCommentAdded }) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!comment.trim() || submitting) return;
    setSubmitting(true);
    socket.emit('add_comment', {
      boardId,
      cardId: card.id,
      content: comment.trim(),
      authorName
    });
    setComment('');
    setSubmitting(false);
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="comment-drawer-overlay" onClick={onClose}>
      <div className="comment-drawer" onClick={e => e.stopPropagation()}>
        <div className="comment-drawer-header">
          <div className="comment-drawer-card-content">{card.content}</div>
          <button className="comment-drawer-close" onClick={onClose} aria-label="Close comments">✕</button>
        </div>

        <div className="comments-list" id="comments-list">
          {(!card.comments || card.comments.length === 0) ? (
            <div className="no-comments">No comments yet — be the first!</div>
          ) : (
            card.comments.map(c => (
              <div key={c.id} className="comment-item" id={`comment-${c.id}`}>
                <div className="comment-author-row">
                  <div className="mini-avatar">{getInitials(c.author_name)}</div>
                  <span className="comment-author-name">{c.author_name}</span>
                  <span className="comment-time">{formatTime(c.created_at)}</span>
                </div>
                <div className="comment-content">{c.content}</div>
              </div>
            ))
          )}
        </div>

        <form className="comment-form" onSubmit={handleSubmit}>
          <textarea
            className="form-textarea"
            placeholder="Add a comment..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            style={{ minHeight: 70 }}
            id="comment-input"
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={!comment.trim() || submitting}
            id="submit-comment-btn"
          >
            {submitting ? '...' : 'Post Comment'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function BoardPage() {
  const { id } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState(() => sessionStorage.getItem(STORAGE_KEY) || '');
  const [activeCard, setActiveCard] = useState(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');
  const socketRef = useRef(null);

  // Fetch board data
  useEffect(() => {
    fetch(`/api/boards/${id}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) setBoard(data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Socket.io setup
  useEffect(() => {
    if (!authorName) return;

    const socket = io({ path: '/socket.io' });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_board', id);
    });

    socket.on('card_added', ({ card, columnId }) => {
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map(col =>
            col.id === columnId
              ? { ...col, cards: [...(col.cards || []), { ...card, comments: [] }] }
              : col
          )
        };
      });
    });

    socket.on('card_moved', ({ card, newColumnId }) => {
      setBoard(prev => {
        if (!prev) return prev;
        // Remove from all columns, re-add to target
        const withoutCard = prev.columns.map(col => ({
          ...col,
          cards: (col.cards || []).filter(c => c.id !== card.id)
        }));
        return {
          ...prev,
          columns: withoutCard.map(col =>
            col.id === newColumnId
              ? { ...col, cards: [...col.cards, card] }
              : col
          )
        };
      });
    });

    socket.on('comment_added', ({ comment, cardId }) => {
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map(col => ({
            ...col,
            cards: (col.cards || []).map(card =>
              card.id === cardId
                ? { ...card, comments: [...(card.comments || []), comment] }
                : card
            )
          }))
        };
      });
      // Also update active card if it's the same
      setActiveCard(prev =>
        prev && prev.id === cardId
          ? { ...prev, comments: [...(prev.comments || []), comment] }
          : prev
      );
    });

    socket.on('column_added', ({ column }) => {
      setBoard(prev => prev ? { ...prev, columns: [...prev.columns, { ...column, cards: [] }] } : prev);
    });

    return () => {
      socket.emit('leave_board', id);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [id, authorName]);

  const handleJoin = (name) => {
    sessionStorage.setItem(STORAGE_KEY, name);
    setAuthorName(name);
  };

  const handleAddCard = useCallback((columnId, content) => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve();
      socketRef.current.emit('add_card', { boardId: id, columnId, content, authorName });
      resolve();
    });
  }, [id, authorName]);

  const handleDragEnd = useCallback((result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const card = board.columns
      .flatMap(c => c.cards || [])
      .find(c => c.id === draggableId);
    if (!card) return;

    // Optimistic update
    setBoard(prev => {
      const newColumns = prev.columns.map(col => ({
        ...col,
        cards: (col.cards || []).filter(c => c.id !== draggableId)
      }));
      const targetCol = newColumns.find(c => c.id === destination.droppableId);
      if (targetCol) {
        targetCol.cards.splice(destination.index, 0, card);
      }
      return { ...prev, columns: newColumns };
    });

    socketRef.current?.emit('move_card', {
      boardId: id,
      cardId: draggableId,
      newColumnId: destination.droppableId,
      newPosition: destination.index
    });
  }, [board, id]);

  const handleAddColumn = async (e) => {
    e.preventDefault();
    const trimmed = newColTitle.trim();
    if (!trimmed) return;

    const res = await fetch(`/api/boards/${id}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed })
    });

    if (res.ok) {
      const col = await res.json();
      const newCol = { ...col, cards: [] };
      setBoard(prev => prev ? { ...prev, columns: [...prev.columns, newCol] } : prev);
      socketRef.current?.emit('add_column', { boardId: id, column: newCol });
      setNewColTitle('');
      setShowAddColumn(false);
    }
  };

  const handleExport = () => {
    window.open(`/api/boards/${id}/export`, '_blank');
  };

  const handleOpenComments = (card) => {
    setActiveCard(card);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <span>Loading board...</span>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="loading-container">
        <div style={{ fontSize: 40 }}>🔍</div>
        <span>Board not found</span>
        <Link to="/" className="btn btn-secondary">← Back to boards</Link>
      </div>
    );
  }

  if (!authorName) {
    return <GuestAuthModal onJoin={handleJoin} />;
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="board-page">
        {/* Board Header */}
        <header className="board-header">
          <div className="board-header-left">
            <Link to="/" className="board-back-btn" aria-label="Back to boards">←</Link>
            <h1 className="board-title-text">{board.title}</h1>
          </div>
          <div className="board-header-right">
            <div className="user-chip">
              <div className="user-avatar">{getInitials(authorName)}</div>
              {authorName}
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleExport}
              id="export-csv-btn"
            >
              ↓ Export CSV
            </button>
          </div>
        </header>

        {/* Columns */}
        <div className="board-columns-wrapper">
          <div className="board-columns">
            {board.columns.map((col, i) => (
              <Column
                key={col.id}
                column={col}
                index={i}
                onAddCard={handleAddCard}
                onOpenComments={handleOpenComments}
              />
            ))}

            {/* Add Column */}
            <div className="add-column-cta">
              {!showAddColumn ? (
                <button
                  className="add-card-toggle"
                  style={{ width: '100%' }}
                  onClick={() => setShowAddColumn(true)}
                  id="add-column-btn"
                >
                  + Add column
                </button>
              ) : (
                <form className="add-column-form" onSubmit={handleAddColumn}>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Column title..."
                    value={newColTitle}
                    onChange={e => setNewColTitle(e.target.value)}
                    autoFocus
                    id="new-column-input"
                  />
                  <div className="add-card-actions">
                    <button type="submit" className="btn btn-primary btn-sm" disabled={!newColTitle.trim()} id="submit-column-btn">Add</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowAddColumn(false); setNewColTitle(''); }}>Cancel</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Comment Drawer */}
        {activeCard && (
          <CommentDrawer
            card={activeCard}
            boardId={id}
            authorName={authorName}
            socket={socketRef.current}
            onClose={() => setActiveCard(null)}
            onCommentAdded={() => {}}
          />
        )}
      </div>
    </DragDropContext>
  );
}
