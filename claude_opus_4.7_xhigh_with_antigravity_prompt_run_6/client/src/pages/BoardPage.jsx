import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { api } from '../lib/api.js';
import { getSocket } from '../lib/socket.js';
import { getDisplayName, setDisplayName } from '../lib/session.js';
import GuestModal from '../components/GuestModal.jsx';
import Column from '../components/Column.jsx';
import CommentsDrawer from '../components/CommentsDrawer.jsx';
import Toast from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import Avatar from '../components/Avatar.jsx';
import { formatRelative } from '../lib/time.js';

const FLASH_MS = 1100;

export default function BoardPage() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [displayName, setNameState] = useState(getDisplayName());
  const [needsName, setNeedsName] = useState(!getDisplayName());
  const [presence, setPresence] = useState(0);
  const [connected, setConnected] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeCardId, setActiveCardId] = useState(null);
  const [flashingCards, setFlashingCards] = useState(() => new Set());
  const [flashingComments, setFlashingComments] = useState(() => new Set());
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const boardRef = useRef(null);
  boardRef.current = board;

  // ----- Flash helpers (visual feedback for remote updates) -----
  const flashCard = useCallback((cardId) => {
    setFlashingCards((prev) => {
      const next = new Set(prev);
      next.add(cardId);
      return next;
    });
    setTimeout(() => {
      setFlashingCards((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    }, FLASH_MS);
  }, []);

  const flashComment = useCallback((commentId) => {
    setFlashingComments((prev) => {
      const next = new Set(prev);
      next.add(commentId);
      return next;
    });
    setTimeout(() => {
      setFlashingComments((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }, FLASH_MS);
  }, []);

  // ----- Initial board fetch -----
  const fetchBoard = useCallback(async () => {
    try {
      const data = await api.getBoard(boardId);
      setBoard(data);
      setLoadError('');
    } catch (err) {
      setLoadError(err.message || 'Could not load board');
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    setLoading(true);
    fetchBoard();
  }, [fetchBoard]);

  // ----- Socket lifecycle -----
  useEffect(() => {
    if (!displayName || !boardId) return undefined;
    const socket = getSocket();

    const join = () => socket.emit('join_board', { boardId, name: displayName });

    const onConnect = () => {
      setConnected(true);
      join();
      // On reconnect, refetch to guarantee consistency
      fetchBoard();
    };
    const onDisconnect = () => setConnected(false);

    const onCardAdded = ({ card }) => {
      if (!card) return;
      setBoard((prev) => {
        if (!prev) return prev;
        if (cardExists(prev, card.id)) return prev;
        return insertCard(prev, card);
      });
      flashCard(card.id);
    };

    const onCardMoved = ({ cardId, fromColumnId, toColumnId, toIndex }) => {
      setBoard((prev) => prev && moveCardInState(prev, cardId, fromColumnId, toColumnId, toIndex));
      flashCard(cardId);
    };

    const onCommentAdded = ({ comment }) => {
      if (!comment) return;
      setBoard((prev) => prev && appendComment(prev, comment));
      flashComment(comment.id);
    };

    const onPresence = ({ boardId: bId, count }) => {
      if (bId === boardId) setPresence(count);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);
    socket.on('presence_updated', onPresence);

    if (socket.connected) onConnect();

    return () => {
      socket.emit('leave_board');
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
      socket.off('presence_updated', onPresence);
    };
  }, [boardId, displayName, fetchBoard, flashCard, flashComment]);

  // ----- Actions -----
  const handleAddCard = (columnId, content) => {
    const socket = getSocket();
    socket.emit('add_card', { columnId, content, authorName: displayName }, (ack) => {
      if (ack && !ack.ok) {
        setToast({ message: ack.error || 'Could not add card', kind: 'error' });
      }
    });
  };

  const handleAddComment = (cardId, content) => {
    const socket = getSocket();
    socket.emit('add_comment', { cardId, content, authorName: displayName }, (ack) => {
      if (ack && !ack.ok) {
        setToast({ message: ack.error || 'Could not add comment', kind: 'error' });
      }
    });
  };

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Optimistic local update
    setBoard((prev) =>
      prev && moveCardInState(prev, draggableId, source.droppableId, destination.droppableId, destination.index)
    );

    const socket = getSocket();
    socket.emit(
      'move_card',
      {
        cardId: draggableId,
        toColumnId: destination.droppableId,
        toIndex: destination.index
      },
      (ack) => {
        if (ack && !ack.ok) {
          setToast({ message: ack.error || 'Could not move card', kind: 'error' });
          fetchBoard();
        }
      }
    );
  };

  const handleAddColumn = async (e) => {
    e?.preventDefault();
    const t = newColumnTitle.trim();
    if (!t) return;
    try {
      const column = await api.createColumn(boardId, t);
      setBoard((prev) =>
        prev ? { ...prev, columns: [...prev.columns, { ...column, cards: [] }] } : prev
      );
      setNewColumnTitle('');
      setShowAddColumn(false);
    } catch (err) {
      setToast({ message: err.message || 'Could not add column', kind: 'error' });
    }
  };

  const handleNameSubmit = (name) => {
    setDisplayName(name);
    setNameState(name);
    setNeedsName(false);
  };

  const handleExport = () => {
    window.location.assign(api.exportUrl(boardId));
  };

  // ----- Active card (for comments drawer) -----
  const activeCard = useMemo(() => {
    if (!board || !activeCardId) return null;
    for (const col of board.columns) {
      const found = col.cards.find((c) => c.id === activeCardId);
      if (found) return found;
    }
    return null;
  }, [board, activeCardId]);

  // ----- Render -----
  if (loading) {
    return (
      <div className="board-page">
        <div className="loading-state" style={{ marginTop: 80 }}>
          <span className="spinner" aria-hidden="true" />
          Loading board…
        </div>
      </div>
    );
  }

  if (loadError || !board) {
    return (
      <div className="board-page">
        <div className="error-state" style={{ marginTop: 80 }}>
          {loadError || 'Board not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="board-page">
      <div className="board-toolbar">
        <div className="board-title-group">
          <h1 id="board-title">{board.title}</h1>
          <div className="board-meta">
            <span>Created {formatRelative(board.createdAt)}</span>
            <span className="presence" id="presence-indicator" title="People viewing this board">
              <span className="pulse" aria-hidden="true" />
              {presence > 0 ? presence : 1} live
            </span>
            <span className={`conn-chip ${connected ? 'online' : 'offline'}`} id="connection-status">
              <span className="led" aria-hidden="true" />
              {connected ? 'Connected' : 'Reconnecting'}
            </span>
          </div>
        </div>
        <div className="toolbar-actions">
          {displayName && (
            <span className="who-chip" id="who-chip">
              <Avatar name={displayName} />
              <span>You're <strong>{displayName}</strong></span>
              <span
                className="change"
                onClick={() => setNeedsName(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setNeedsName(true); }}
              >
                change
              </span>
            </span>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExport}
            id="export-csv-btn"
            title="Download board as CSV"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board-columns" id="board-columns">
          {board.columns.map((col, idx) => (
            <Column
              key={col.id}
              column={col}
              index={idx}
              onAddCard={handleAddCard}
              onOpenComments={(c) => setActiveCardId(c.id)}
              flashingCards={flashingCards}
            />
          ))}

          {!showAddColumn ? (
            <button
              type="button"
              className="add-column add-column-trigger"
              onClick={() => setShowAddColumn(true)}
              id="add-column-trigger"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add a column
            </button>
          ) : (
            <form className="add-column" onSubmit={handleAddColumn} id="add-column-form">
              <label className="label" htmlFor="new-column-title">New column</label>
              <input
                id="new-column-title"
                className="input"
                placeholder="Column title"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                maxLength={60}
                autoFocus
              />
              <div className="add-card-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddColumn(false);
                    setNewColumnTitle('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!newColumnTitle.trim()}
                  id="add-column-submit"
                >
                  Add column
                </button>
              </div>
            </form>
          )}
        </div>
      </DragDropContext>

      <GuestModal open={needsName} onSubmit={handleNameSubmit} initial={displayName} />

      <CommentsDrawer
        card={activeCard}
        displayName={displayName}
        onClose={() => setActiveCardId(null)}
        onSubmit={handleAddComment}
        flashingComments={flashingComments}
      />

      {toast && (
        <Toast
          message={toast.message}
          kind={toast.kind}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

// ----- Pure state helpers -----

function cardExists(board, cardId) {
  for (const col of board.columns) {
    if (col.cards.some((c) => c.id === cardId)) return true;
  }
  return false;
}

function insertCard(board, card) {
  return {
    ...board,
    columns: board.columns.map((col) =>
      col.id === card.columnId
        ? { ...col, cards: [...col.cards, { ...card, comments: card.comments || [] }] }
        : col
    )
  };
}

function moveCardInState(board, cardId, fromColumnId, toColumnId, toIndex) {
  let movedCard = null;
  const columnsAfterRemoval = board.columns.map((col) => {
    if (col.id !== fromColumnId && !col.cards.some((c) => c.id === cardId)) return col;
    const filtered = [];
    for (const c of col.cards) {
      if (c.id === cardId) movedCard = c;
      else filtered.push(c);
    }
    return { ...col, cards: filtered };
  });

  if (!movedCard) return board;

  const targetIndex = columnsAfterRemoval.findIndex((c) => c.id === toColumnId);
  if (targetIndex === -1) return board;

  const target = columnsAfterRemoval[targetIndex];
  const newCards = [...target.cards];
  const idx = Math.max(0, Math.min(toIndex, newCards.length));
  newCards.splice(idx, 0, { ...movedCard, columnId: toColumnId });
  columnsAfterRemoval[targetIndex] = { ...target, cards: newCards };

  return { ...board, columns: columnsAfterRemoval };
}

function appendComment(board, comment) {
  return {
    ...board,
    columns: board.columns.map((col) => ({
      ...col,
      cards: col.cards.map((card) => {
        if (card.id !== comment.cardId) return card;
        if (card.comments?.some((c) => c.id === comment.id)) return card;
        return { ...card, comments: [...(card.comments || []), comment] };
      })
    }))
  };
}
