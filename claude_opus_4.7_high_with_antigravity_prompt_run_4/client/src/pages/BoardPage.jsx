import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { api } from '../api.js';
import { getSocket, emitAck } from '../socket.js';
import { useToast } from '../components/Toast.jsx';
import GuestNameModal from '../components/GuestNameModal.jsx';
import Column from '../components/Column.jsx';
import CommentDrawer from '../components/CommentDrawer.jsx';

const NAME_KEY = 'retro:displayName';

function applyCardAdded(board, card) {
  return {
    ...board,
    columns: board.columns.map((col) =>
      col.id === card.column_id ? { ...col, cards: [...col.cards, card] } : col
    ),
  };
}

function applyCardMoved(board, { cardId, sourceColumnId, targetColumnId, targetIndex }) {
  let movingCard = null;
  const columnsAfterRemove = board.columns.map((col) => {
    if (col.id !== sourceColumnId) return col;
    const newCards = col.cards.filter((c) => {
      if (c.id === cardId) {
        movingCard = c;
        return false;
      }
      return true;
    });
    return { ...col, cards: newCards };
  });
  if (!movingCard) return board;
  const columns = columnsAfterRemove.map((col) => {
    if (col.id !== targetColumnId) return col;
    const cards = [...col.cards];
    const idx = Math.max(0, Math.min(targetIndex, cards.length));
    cards.splice(idx, 0, { ...movingCard, column_id: targetColumnId });
    return { ...col, cards };
  });
  return { ...board, columns };
}

function applyCommentAdded(board, comment) {
  return {
    ...board,
    columns: board.columns.map((col) => ({
      ...col,
      cards: col.cards.map((c) =>
        c.id === comment.card_id
          ? { ...c, comments: [...(c.comments || []), comment] }
          : c
      ),
    })),
  };
}

function applyColumnAdded(board, column) {
  if (board.columns.some((c) => c.id === column.id)) return board;
  return { ...board, columns: [...board.columns, { ...column, cards: [] }] };
}

export default function BoardPage() {
  const { id: boardId } = useParams();
  const toast = useToast();

  const [displayName, setDisplayName] = useState(() => localStorage.getItem(NAME_KEY) || '');
  const [board, setBoard] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [openCardId, setOpenCardId] = useState(null);

  const joinedRef = useRef(false);
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const openCard = useMemo(() => {
    if (!board || !openCardId) return null;
    for (const col of board.columns) {
      const c = col.cards.find((cd) => cd.id === openCardId);
      if (c) return c;
    }
    return null;
  }, [board, openCardId]);

  const reloadBoard = useCallback(async () => {
    try {
      const fresh = await api.getBoard(boardId);
      setBoard(fresh);
    } catch (err) {
      toastRef.current.push(err.message, { kind: 'error' });
    }
  }, [boardId]);

  const reloadBoardRef = useRef(reloadBoard);
  reloadBoardRef.current = reloadBoard;

  useEffect(() => {
    let cancelled = false;
    api
      .getBoard(boardId)
      .then((data) => {
        if (!cancelled) setBoard(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  // Socket lifecycle: this effect intentionally does NOT depend on `board` —
  // re-joining on every board mutation would re-broadcast `presence_joined`
  // to every other client, creating a notification storm.
  useEffect(() => {
    if (!displayName) return undefined;
    const socket = getSocket();
    joinedRef.current = false;

    function doJoin() {
      emitAck('join_board', { boardId, displayName })
        .then(() => {
          const wasJoined = joinedRef.current;
          joinedRef.current = true;
          setConnected(true);
          // Only refetch on *re*-join (reconnect), not the very first join.
          if (wasJoined) reloadBoardRef.current();
        })
        .catch((err) => {
          toastRef.current.push(`Couldn't join: ${err.message}`, { kind: 'error' });
        });
    }

    if (socket.connected) doJoin();

    function onConnect() { doJoin(); }
    function onDisconnect() { setConnected(false); }
    function onCardAdded(card) {
      setBoard((prev) => (prev ? applyCardAdded(prev, card) : prev));
    }
    function onCardMoved(payload) {
      setBoard((prev) => (prev ? applyCardMoved(prev, payload) : prev));
    }
    function onCommentAdded(comment) {
      setBoard((prev) => (prev ? applyCommentAdded(prev, comment) : prev));
    }
    function onColumnAdded(column) {
      setBoard((prev) => (prev ? applyColumnAdded(prev, column) : prev));
    }
    function onPresenceJoined({ displayName: who }) {
      toastRef.current.push(`${who} joined the board`);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);
    socket.on('column_added', onColumnAdded);
    socket.on('presence_joined', onPresenceJoined);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
      socket.off('column_added', onColumnAdded);
      socket.off('presence_joined', onPresenceJoined);
    };
  }, [boardId, displayName]);

  const handleSetName = (name) => {
    localStorage.setItem(NAME_KEY, name);
    setDisplayName(name);
  };

  const handleAddCard = async (columnId, content) => {
    try {
      await emitAck('add_card', { columnId, content });
    } catch (err) {
      toast.push(err.message, { kind: 'error' });
    }
  };

  const handleAddComment = async (cardId, content) => {
    try {
      await emitAck('add_comment', { cardId, content });
    } catch (err) {
      toast.push(err.message, { kind: 'error' });
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination || !board) return;
    const { draggableId, source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    setBoard((prev) =>
      prev
        ? applyCardMoved(prev, {
            cardId: draggableId,
            sourceColumnId: source.droppableId,
            targetColumnId: destination.droppableId,
            targetIndex: destination.index,
          })
        : prev
    );

    try {
      await emitAck('move_card', {
        cardId: draggableId,
        targetColumnId: destination.droppableId,
        targetIndex: destination.index,
      });
    } catch (err) {
      toast.push(err.message, { kind: 'error' });
      reloadBoard();
    }
  };

  const handleAddColumn = async (e) => {
    e.preventDefault();
    const trimmed = newColumnTitle.trim();
    if (!trimmed) return;
    try {
      await api.createColumn(boardId, trimmed);
      setNewColumnTitle('');
      setShowAddColumn(false);
    } catch (err) {
      toast.push(err.message, { kind: 'error' });
    }
  };

  if (loadError) {
    return (
      <div className="center-fill">
        <div className="glass" style={{ padding: 32, textAlign: 'center' }}>
          <h2 style={{ marginBottom: 8 }}>Board not found</h2>
          <p style={{ color: 'var(--text-dim)' }}>{loadError}</p>
          <Link to="/" className="btn" style={{ marginTop: 16 }}>← Back to boards</Link>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="center-fill">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div className="spinner" />
          <span>Loading board…</span>
        </div>
      </div>
    );
  }

  if (!displayName) {
    return <GuestNameModal onSubmit={handleSetName} />;
  }

  return (
    <div className="board-page">
      <div className="board-header container">
        <div className="board-header-inner">
          <div className="board-title-block">
            <Link to="/" className="board-back" id="board-back-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              All boards
            </Link>
            <h1 className="board-title">{board.title}</h1>
            <div className="presence" id="presence-indicator">
              <span className={`presence-dot ${connected ? '' : 'off'}`} />
              {connected ? (
                <span>Live · joined as <strong style={{ color: 'var(--text)' }}>{displayName}</strong></span>
              ) : (
                <span>Reconnecting…</span>
              )}
            </div>
          </div>
          <div className="board-actions">
            <button
              type="button"
              className="btn"
              onClick={() => setShowAddColumn((v) => !v)}
              id="toggle-add-column"
            >
              + Add column
            </button>
            <a
              className="btn btn-primary"
              href={api.exportUrl(boardId)}
              id="export-csv-btn"
              download
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </a>
          </div>
        </div>
      </div>

      <div className="board-body">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="columns">
            {board.columns.map((column) => (
              <Column
                key={column.id}
                column={column}
                onAddCard={handleAddCard}
                onOpenComments={(card) => setOpenCardId(card.id)}
              />
            ))}

            {showAddColumn ? (
              <form className="add-column" onSubmit={handleAddColumn} id="add-column-form">
                <h4>New column</h4>
                <input
                  className="input"
                  autoFocus
                  placeholder="Column title"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  maxLength={60}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddColumn(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={!newColumnTitle.trim()}>
                    Create
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="add-column"
                style={{ cursor: 'pointer', color: 'var(--text-dim)', textAlign: 'left' }}
                onClick={() => setShowAddColumn(true)}
                id="add-column-cta"
              >
                <h4 style={{ color: 'var(--text-dim)' }}>+ Add another column</h4>
                <span style={{ fontSize: 12.5, color: 'var(--text-mute)' }}>
                  Reframe the conversation with a custom column.
                </span>
              </button>
            )}
          </div>
        </DragDropContext>
      </div>

      {openCard && (
        <CommentDrawer
          card={openCard}
          onClose={() => setOpenCardId(null)}
          onSubmit={handleAddComment}
        />
      )}
    </div>
  );
}
