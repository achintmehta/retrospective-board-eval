import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import {
  DragDropContext,
  Droppable,
  Draggable,
} from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import type { FullBoard, Card, Comment, BoardColumn } from '../types';
import AuthModal from '../components/AuthModal';
import CommentDrawer from '../components/CommentDrawer';

// ─── Socket singleton ─────────────────────────────────────────────────────────
let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
  }
  return socket;
}

// ─── Column accent colors ──────────────────────────────────────────────────────
const COL_COLORS = [
  '#58a6ff', '#3fb950', '#f78166', '#bc8cff', '#d29922', '#39d353',
];

// ─── Board Page Component ─────────────────────────────────────────────────────
export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();

  const [board, setBoard] = useState<FullBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  // Auth
  const [userName, setUserName] = useState<string>(() => {
    return sessionStorage.getItem('retro_user_name') || '';
  });
  const [showAuth, setShowAuth] = useState(!sessionStorage.getItem('retro_user_name'));

  // UI state
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [addingCardCol, setAddingCardCol] = useState<string | null>(null);
  const [newCardText, setNewCardText] = useState('');
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  // ─── Fetch board data ─────────────────────────────────────────────────────
  const fetchBoard = useCallback(async () => {
    if (!boardId) return;
    try {
      const res = await fetch(`/api/boards/${boardId}`);
      if (res.status === 404) { navigate('/'); return; }
      if (!res.ok) throw new Error('Failed to load board');
      const data: FullBoard = await res.json();
      setBoard(data);
      document.title = `${data.title} — RetroBoard`;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [boardId, navigate]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // ─── Socket.io setup ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!boardId || showAuth) return;

    const sock = getSocket();

    sock.on('connect', () => {
      setConnected(true);
      sock.emit('join_board', boardId);
    });

    sock.on('disconnect', () => setConnected(false));

    if (sock.connected) {
      setConnected(true);
      sock.emit('join_board', boardId);
    }

    // ─── Real-time event handlers ─────────────────────────────────────────
    sock.on('card_added', (card: Card) => {
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map(col =>
            col.id === card.column_id
              ? { ...col, cards: [...col.cards, { ...card, comments: [] }] }
              : col
          ),
        };
      });
    });

    sock.on('card_moved', ({ cardId, newColumnId, newPosition }: { cardId: string; newColumnId: string; newPosition: number }) => {
      setBoard(prev => {
        if (!prev) return prev;
        let movedCard: Card | undefined;
        const cols = prev.columns.map(col => {
          const idx = col.cards.findIndex(c => c.id === cardId);
          if (idx !== -1) {
            movedCard = col.cards[idx];
            return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
          }
          return col;
        });
        if (!movedCard) return prev;
        const updatedCard = { ...movedCard, column_id: newColumnId, position: newPosition };
        return {
          ...prev,
          columns: cols.map(col => {
            if (col.id !== newColumnId) return col;
            const newCards = [...col.cards];
            newCards.splice(newPosition, 0, updatedCard);
            return { ...col, cards: newCards };
          }),
        };
      });
    });

    sock.on('comment_added', (comment: Comment) => {
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map(col => ({
            ...col,
            cards: col.cards.map(card =>
              card.id === comment.card_id
                ? { ...card, comments: [...(card.comments || []), comment] }
                : card
            ),
          })),
        };
      });
      // Update selected card if open
      setSelectedCard(prev =>
        prev?.id === comment.card_id
          ? { ...prev, comments: [...(prev.comments || []), comment] }
          : prev
      );
    });

    sock.on('column_added', (col: BoardColumn) => {
      setBoard(prev => {
        if (!prev) return prev;
        if (prev.columns.some(c => c.id === col.id)) return prev;
        return { ...prev, columns: [...prev.columns, { ...col, cards: [] }] };
      });
    });

    return () => {
      sock.emit('leave_board', boardId);
      sock.off('connect');
      sock.off('disconnect');
      sock.off('card_added');
      sock.off('card_moved');
      sock.off('comment_added');
      sock.off('column_added');
    };
  }, [boardId, showAuth]);

  // ─── Auth handler ──────────────────────────────────────────────────────────
  function handleAuth(name: string) {
    sessionStorage.setItem('retro_user_name', name);
    setUserName(name);
    setShowAuth(false);
  }

  // ─── Add card ─────────────────────────────────────────────────────────────
  function handleAddCard(columnId: string) {
    const content = newCardText.trim();
    if (!content) return;
    getSocket().emit('add_card', { boardId, columnId, content, authorName: userName });
    setNewCardText('');
    setAddingCardCol(null);
  }

  // ─── Move card (drag-and-drop) ────────────────────────────────────────────
  function handleDragEnd(result: DropResult) {
    const { draggableId, source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Optimistic update
    setBoard(prev => {
      if (!prev) return prev;
      let movedCard: Card | undefined;
      const cols = prev.columns.map(col => {
        const idx = col.cards.findIndex(c => c.id === draggableId);
        if (idx !== -1) {
          movedCard = col.cards[idx];
          const newCards = [...col.cards];
          newCards.splice(idx, 1);
          return { ...col, cards: newCards };
        }
        return col;
      });
      if (!movedCard) return prev;
      const updatedCard = { ...movedCard, column_id: destination.droppableId, position: destination.index };
      return {
        ...prev,
        columns: cols.map(col => {
          if (col.id !== destination.droppableId) return col;
          const newCards = [...col.cards];
          newCards.splice(destination.index, 0, updatedCard);
          return { ...col, cards: newCards };
        }),
      };
    });

    // Emit to server
    getSocket().emit('move_card', {
      boardId,
      cardId: draggableId,
      newColumnId: destination.droppableId,
      newPosition: destination.index,
    });
  }

  // ─── Add comment ──────────────────────────────────────────────────────────
  function handleAddComment(content: string) {
    if (!selectedCard) return;
    getSocket().emit('add_comment', {
      boardId,
      cardId: selectedCard.id,
      content,
      authorName: userName,
    });
  }

  // ─── Add column ──────────────────────────────────────────────────────────
  async function handleAddColumn(e: React.FormEvent) {
    e.preventDefault();
    const title = newColTitle.trim();
    if (!title || !boardId) return;
    try {
      const res = await fetch(`/api/boards/${boardId}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('Failed to add column');
      const col = await res.json();
      // Broadcast via socket
      getSocket().emit('add_column', { boardId, column: col });
      setBoard(prev => prev
        ? { ...prev, columns: [...prev.columns, { ...col, cards: [] }] }
        : prev);
      setNewColTitle('');
      setAddingColumn(false);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Failed to add column', 'error');
    }
  }

  // ─── Toast ────────────────────────────────────────────────────────────────
  function addToast(message: string, type: 'success' | 'error' = 'success') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }

  // ─── Export ───────────────────────────────────────────────────────────────
  function handleExport() {
    window.location.href = `/api/boards/${boardId}/export`;
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  );

  if (error) return (
    <div className="app-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <p className="error-banner">{error}</p>
      <Link to="/" className="btn btn-secondary">← Back to boards</Link>
    </div>
  );

  return (
    <>
      {showAuth && board && (
        <AuthModal boardTitle={board.title} onSubmit={handleAuth} />
      )}

      {/* Board Header */}
      <header className="app-header">
        <Link to="/" className="logo">
          <span className="logo-icon">🔁</span>
          RetroBoard
        </Link>

        <div style={{ width: '1px', height: '20px', background: 'var(--border-default)' }} />

        <h1 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {board?.title}
        </h1>

        <div className="header-actions">
          <div className="user-badge" id="user-badge">
            <div className="user-avatar">
              {userName.charAt(0).toUpperCase() || '?'}
            </div>
            {userName || 'Guest'}
          </div>

          <div
            className={`connection-indicator ${connected ? '' : 'disconnected'}`}
            title={connected ? 'Connected' : 'Disconnected'}
            aria-label={connected ? 'Connected' : 'Disconnected'}
          />

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExport}
            id="export-csv-btn"
          >
            ⬇ Export CSV
          </button>
        </div>
      </header>

      {/* Board Body */}
      <div className="board-page">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="columns-container">
            {board?.columns.map((col, colIdx) => (
              <Droppable key={col.id} droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    className="column"
                    style={{
                      borderTop: `3px solid ${COL_COLORS[colIdx % COL_COLORS.length]}`,
                      background: snapshot.isDraggingOver
                        ? 'rgba(88,166,255,0.04)'
                        : undefined,
                    }}
                  >
                    <div className="column-header">
                      <div
                        className="column-color-dot"
                        style={{ background: COL_COLORS[colIdx % COL_COLORS.length] }}
                      />
                      <span className="column-title">{col.title}</span>
                      <span className="column-count">{col.cards.length}</span>
                    </div>

                    <div
                      className="column-body"
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {col.cards.map((card, cardIdx) => (
                        <Draggable key={card.id} draggableId={card.id} index={cardIdx}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={`retro-card ${dragSnapshot.isDragging ? 'is-dragging' : ''}`}
                              onClick={() => setSelectedCard(card)}
                              id={`card-${card.id}`}
                              role="button"
                              tabIndex={0}
                              onKeyDown={e => { if (e.key === 'Enter') setSelectedCard(card); }}
                              aria-label={`Card: ${card.content}`}
                            >
                              <p className="retro-card-content">{card.content}</p>
                              <div className="retro-card-meta">
                                <span className="retro-card-author">{card.author_name}</span>
                                {(card.comments?.length ?? 0) > 0 && (
                                  <span className="retro-card-comments-count">
                                    💬 {card.comments.length}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {snapshot.isDraggingOver && (
                        <div className="drop-placeholder" />
                      )}
                    </div>

                    {/* Add card footer */}
                    <div className="column-footer">
                      {addingCardCol === col.id ? (
                        <div className="add-card-form">
                          <textarea
                            className="input textarea"
                            placeholder="What's on your mind?"
                            value={newCardText}
                            onChange={e => setNewCardText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddCard(col.id);
                              }
                              if (e.key === 'Escape') {
                                setAddingCardCol(null);
                                setNewCardText('');
                              }
                            }}
                            autoFocus
                            rows={2}
                            id={`card-input-${col.id}`}
                            style={{ minHeight: 64 }}
                          />
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleAddCard(col.id)}
                              disabled={!newCardText.trim()}
                              id={`add-card-submit-${col.id}`}
                            >
                              Add Card
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => { setAddingCardCol(null); setNewCardText(''); }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="add-card-btn"
                          onClick={() => { setAddingCardCol(col.id); setNewCardText(''); }}
                          id={`add-card-btn-${col.id}`}
                          disabled={showAuth}
                        >
                          <span>+</span> Add Card
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}

            {/* Add Column button / form */}
            {!addingColumn ? (
              <button
                className="add-column-card"
                onClick={() => setAddingColumn(true)}
                id="add-column-card-btn"
                disabled={showAuth}
              >
                <span style={{ fontSize: '1.5rem' }}>+</span>
                <span>Add Column</span>
              </button>
            ) : (
              <form className="add-column-form-inline" onSubmit={handleAddColumn}>
                <input
                  className="input"
                  type="text"
                  placeholder="Column title..."
                  value={newColTitle}
                  onChange={e => setNewColTitle(e.target.value)}
                  autoFocus
                  id="new-column-input"
                  required
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={!newColTitle.trim()}
                    id="add-column-submit-btn"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setAddingColumn(false); setNewColTitle(''); }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </DragDropContext>
      </div>

      {/* Comment Drawer */}
      {selectedCard && (
        <CommentDrawer
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onAddComment={handleAddComment}
        />
      )}

      {/* Toast Notifications */}
      <div className="toast-container" aria-live="polite">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </>
  );
}
