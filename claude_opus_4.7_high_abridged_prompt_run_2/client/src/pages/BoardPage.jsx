import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core';
import { api } from '../lib/api.js';
import { getSocket, disconnectSocket } from '../lib/socket.js';
import {
  getDisplayName,
  setDisplayName as saveDisplayName,
  colorForName,
  initialsFor,
} from '../lib/identity.js';
import { timeAgo } from '../lib/format.js';

import GuestAuthModal from '../components/GuestAuthModal.jsx';
import BoardColumn from '../components/BoardColumn.jsx';
import CardView from '../components/CardView.jsx';
import CommentDrawer from '../components/CommentDrawer.jsx';
import PresenceBar from '../components/PresenceBar.jsx';
import Toast from '../components/Toast.jsx';
import AddColumnModal from '../components/AddColumnModal.jsx';

import './BoardPage.css';

export default function BoardPage() {
  const { boardId } = useParams();
  const [displayName, setDisplayNameState] = useState(getDisplayName());
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCard, setActiveCard] = useState(null);
  const [openCommentsForCardId, setOpenCommentsForCardId] = useState(null);
  const [presenceCount, setPresenceCount] = useState(1);
  const [toast, setToast] = useState(null);
  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef(null);

  const showToast = useCallback((message, kind = 'info') => {
    setToast({ message, kind, id: Date.now() });
  }, []);

  // Load board data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getBoard(boardId)
      .then((b) => {
        if (!cancelled) {
          setBoard(b);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  // Connect socket after we have a display name and board data
  useEffect(() => {
    if (!displayName || !board) return;

    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      socket.emit('join_board', { boardId, displayName }, (ack) => {
        if (ack?.ok && ack.board) {
          setBoard(ack.board);
        } else if (ack && !ack.ok) {
          setError(ack.error || 'Failed to join board');
        }
      });
    };
    const onDisconnect = () => setConnected(false);

    const onCardAdded = ({ card }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === card.column_id
              ? { ...col, cards: [...col.cards, { ...card, comments: [] }] }
              : col
          ),
        };
      });
      if (card.author_name && card.author_name !== displayName) {
        showToast(`${card.author_name} added a card`);
      }
    };

    const onCardMoved = ({ cardId, fromColumnId, toColumnId, toPosition, movedBy }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        let moving = null;
        const stripped = prev.columns.map((col) => {
          if (col.id !== fromColumnId) return col;
          const cards = col.cards.filter((c) => {
            if (c.id === cardId) {
              moving = c;
              return false;
            }
            return true;
          });
          return { ...col, cards };
        });
        if (!moving) return prev;
        return {
          ...prev,
          columns: stripped.map((col) => {
            if (col.id !== toColumnId) return col;
            const cards = [...col.cards];
            const idx = Math.max(0, Math.min(toPosition, cards.length));
            cards.splice(idx, 0, { ...moving, column_id: toColumnId, position: idx });
            return { ...col, cards };
          }),
        };
      });
      if (movedBy && movedBy !== displayName) {
        showToast(`${movedBy} moved a card`);
      }
    };

    const onCommentAdded = ({ comment }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            cards: col.cards.map((c) =>
              c.id === comment.card_id
                ? { ...c, comments: [...(c.comments || []), comment] }
                : c
            ),
          })),
        };
      });
      if (comment.author_name && comment.author_name !== displayName) {
        showToast(`${comment.author_name} commented`);
      }
    };

    const onColumnAdded = ({ column }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        if (prev.columns.some((c) => c.id === column.id)) return prev;
        return {
          ...prev,
          columns: [...prev.columns, { ...column, cards: [] }],
        };
      });
    };

    const onPresence = ({ count }) => setPresenceCount(count);
    const onUserJoined = ({ displayName: n }) => showToast(`${n} joined`, 'success');
    const onUserLeft = ({ displayName: n }) => showToast(`${n} left`);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);
    socket.on('column_added', onColumnAdded);
    socket.on('presence_update', onPresence);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
      socket.off('column_added', onColumnAdded);
      socket.off('presence_update', onPresence);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
    };
  }, [boardId, displayName, board?.id, showToast]);

  useEffect(() => () => disconnectSocket(), []);

  const handleAuth = (name) => {
    saveDisplayName(name);
    setDisplayNameState(name);
  };

  const handleAddCard = (columnId, content) => {
    if (!socketRef.current || !content.trim()) return;
    socketRef.current.emit('add_card', { columnId, content: content.trim() }, (ack) => {
      if (!ack?.ok) showToast(ack?.error || 'Failed to add card', 'error');
    });
  };

  const handleAddComment = (cardId, content) => {
    if (!socketRef.current || !content.trim()) return;
    socketRef.current.emit('add_comment', { cardId, content: content.trim() }, (ack) => {
      if (!ack?.ok) showToast(ack?.error || 'Failed to add comment', 'error');
    });
  };

  const handleAddColumn = async (title, color) => {
    try {
      await api.addColumn(boardId, title, color);
      setAddColumnOpen(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const findCard = useCallback(
    (cardId) => {
      if (!board) return null;
      for (const col of board.columns) {
        const card = col.cards.find((c) => c.id === cardId);
        if (card) return { card, column: col };
      }
      return null;
    },
    [board]
  );

  const handleDragStart = (event) => {
    const found = findCard(event.active.id);
    setActiveCard(found?.card || null);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveCard(null);
    if (!over || !board) return;

    const from = findCard(active.id);
    if (!from) return;

    // Over could be a column or another card
    const overData = over.data?.current || {};
    let toColumnId = null;
    let toPosition = null;

    if (overData.type === 'column') {
      toColumnId = over.id;
      const col = board.columns.find((c) => c.id === toColumnId);
      toPosition = col ? col.cards.length : 0;
      if (from.column.id === toColumnId) {
        toPosition = Math.max(0, toPosition - 1);
      }
    } else if (overData.type === 'card') {
      toColumnId = overData.columnId;
      const col = board.columns.find((c) => c.id === toColumnId);
      if (!col) return;
      const overIndex = col.cards.findIndex((c) => c.id === over.id);
      toPosition = overIndex < 0 ? col.cards.length : overIndex;
    } else {
      return;
    }

    // No-op check
    if (from.column.id === toColumnId && from.card.position === toPosition) return;

    // Optimistic update
    setBoard((prev) => {
      if (!prev) return prev;
      const stripped = prev.columns.map((col) => {
        if (col.id !== from.column.id) return col;
        return { ...col, cards: col.cards.filter((c) => c.id !== from.card.id) };
      });
      return {
        ...prev,
        columns: stripped.map((col) => {
          if (col.id !== toColumnId) return col;
          const cards = [...col.cards];
          const idx = Math.max(0, Math.min(toPosition, cards.length));
          cards.splice(idx, 0, { ...from.card, column_id: toColumnId, position: idx });
          return { ...col, cards };
        }),
      };
    });

    socketRef.current?.emit(
      'move_card',
      { cardId: from.card.id, toColumnId, toPosition },
      (ack) => {
        if (!ack?.ok) {
          showToast(ack?.error || 'Failed to move card', 'error');
          // Refetch on failure to reconcile
          api.getBoard(boardId).then(setBoard).catch(() => {});
        }
      }
    );
  };

  const openCommentCard = useMemo(() => {
    if (!openCommentsForCardId || !board) return null;
    for (const col of board.columns) {
      const card = col.cards.find((c) => c.id === openCommentsForCardId);
      if (card) return { card, columnTitle: col.title };
    }
    return null;
  }, [openCommentsForCardId, board]);

  // Rendering
  if (!displayName && !loading) {
    return (
      <GuestAuthModal
        boardTitle={board?.title}
        onSubmit={handleAuth}
      />
    );
  }

  if (loading) {
    return (
      <div className="board-loading">
        <div className="board-loading-spinner" />
        <p>Loading board…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="board-error">
        <h2>Couldn't load board</h2>
        <p>{error}</p>
        <Link to="/" className="btn btn-primary">
          Back to home
        </Link>
      </div>
    );
  }

  if (!board) return null;
  if (!displayName) {
    return <GuestAuthModal boardTitle={board.title} onSubmit={handleAuth} />;
  }

  return (
    <div className="board-page">
      <div className="board-header">
        <div className="board-header-main">
          <h1 className="board-title">{board.title}</h1>
          <div className="board-header-meta">
            <span className="chip">
              <span
                className={`board-connect-dot ${connected ? 'is-live' : 'is-dead'}`}
              />
              {connected ? 'Live' : 'Reconnecting…'}
            </span>
            <span className="chip">Created {timeAgo(board.created_at)}</span>
          </div>
        </div>
        <div className="board-header-actions">
          <PresenceBar
            count={presenceCount}
            you={{ name: displayName, color: colorForName(displayName), initials: initialsFor(displayName) }}
          />
          <button className="btn btn-ghost" onClick={() => setAddColumnOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Add column
          </button>
          <a
            className="btn btn-primary"
            href={api.exportUrl(board.id)}
            download
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export CSV
          </a>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveCard(null)}
      >
        <div className="board-columns">
          {board.columns.map((col) => (
            <BoardColumn
              key={col.id}
              column={col}
              onAddCard={(content) => handleAddCard(col.id, content)}
              onOpenComments={(cardId) => setOpenCommentsForCardId(cardId)}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeCard ? <CardView card={activeCard} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {openCommentCard && (
        <CommentDrawer
          card={openCommentCard.card}
          columnTitle={openCommentCard.columnTitle}
          onClose={() => setOpenCommentsForCardId(null)}
          onSubmit={(content) => handleAddComment(openCommentCard.card.id, content)}
        />
      )}

      {addColumnOpen && (
        <AddColumnModal
          onClose={() => setAddColumnOpen(false)}
          onSubmit={handleAddColumn}
        />
      )}

      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          kind={toast.kind}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
