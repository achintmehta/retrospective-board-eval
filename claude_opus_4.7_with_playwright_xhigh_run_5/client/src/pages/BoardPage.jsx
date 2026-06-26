import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { getBoard, createColumn, exportBoardUrl } from '../api.js';
import { getSocket } from '../socket.js';
import { getDisplayName, setDisplayName } from '../guest.js';
import GuestNameModal from '../components/GuestNameModal.jsx';
import Column from '../components/Column.jsx';

export default function BoardPage() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayName, setName] = useState(getDisplayName());
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [connected, setConnected] = useState(false);

  const socketRef = useRef(null);

  // Initial fetch (also re-runs after reconnect to resync).
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBoard(boardId);
      setBoard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Connect socket and join the board room once we have a display name.
  useEffect(() => {
    if (!displayName) return;
    const socket = getSocket();
    socketRef.current = socket;

    function joinRoom() {
      socket.emit('join_board', { boardId, displayName }, (resp) => {
        if (resp && !resp.ok) {
          setError(resp.error || 'Failed to join board');
        }
      });
    }

    function onConnect() {
      setConnected(true);
      joinRoom();
      // Resync on reconnect so we don't miss events fired while offline.
      refetch();
    }
    function onDisconnect() {
      setConnected(false);
    }

    if (socket.connected) {
      onConnect();
    }
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    function onCardAdded(card) {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === card.column_id
              ? {
                  ...col,
                  cards: col.cards.some((c) => c.id === card.id)
                    ? col.cards
                    : [...col.cards, { ...card, comments: card.comments || [] }],
                }
              : col
          ),
        };
      });
    }

    function onCardMoved({ card, sourceColumnId, targetColumnId }) {
      setBoard((prev) => {
        if (!prev) return prev;
        // Remove card from its old column, then insert into the target at
        // its server-assigned position. We preserve existing comments.
        let movingCard = null;
        const stripped = prev.columns.map((col) => {
          if (col.id !== sourceColumnId) return col;
          return {
            ...col,
            cards: col.cards.filter((c) => {
              if (c.id === card.id) {
                movingCard = c;
                return false;
              }
              return true;
            }),
          };
        });
        const updatedCard = {
          ...card,
          comments: (movingCard && movingCard.comments) || card.comments || [],
        };
        return {
          ...prev,
          columns: stripped.map((col) => {
            if (col.id !== targetColumnId) return col;
            const without = col.cards.filter((c) => c.id !== card.id);
            const next = [...without];
            const idx = Math.min(Math.max(card.position, 0), next.length);
            next.splice(idx, 0, updatedCard);
            return { ...col, cards: next };
          }),
        };
      });
    }

    function onCommentAdded(comment) {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            cards: col.cards.map((card) =>
              card.id === comment.card_id
                ? {
                    ...card,
                    comments: card.comments.some((c) => c.id === comment.id)
                      ? card.comments
                      : [...card.comments, comment],
                  }
                : card
            ),
          })),
        };
      });
    }

    function onColumnAdded(column) {
      setBoard((prev) => {
        if (!prev) return prev;
        if (prev.columns.some((c) => c.id === column.id)) return prev;
        return {
          ...prev,
          columns: [...prev.columns, { ...column, cards: [] }],
        };
      });
    }

    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);
    socket.on('column_added', onColumnAdded);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
      socket.off('column_added', onColumnAdded);
      socket.emit('leave_board', { boardId });
    };
  }, [boardId, displayName, refetch]);

  function handleSetName(name) {
    setDisplayName(name);
    setName(name);
  }

  function handleAddCard(columnId, content) {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('add_card', { boardId, columnId, content });
  }

  function handleAddComment(cardId, content) {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('add_comment', { boardId, cardId, content });
  }

  function handleDragEnd(result) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Optimistic local update — the server broadcast will reconcile.
    setBoard((prev) => {
      if (!prev) return prev;
      let moving = null;
      const stripped = prev.columns.map((col) => {
        if (col.id !== source.droppableId) return col;
        return {
          ...col,
          cards: col.cards.filter((c) => {
            if (c.id === draggableId) {
              moving = c;
              return false;
            }
            return true;
          }),
        };
      });
      if (!moving) return prev;
      return {
        ...prev,
        columns: stripped.map((col) => {
          if (col.id !== destination.droppableId) return col;
          const next = [...col.cards];
          next.splice(destination.index, 0, { ...moving, column_id: col.id });
          return { ...col, cards: next };
        }),
      };
    });

    const socket = socketRef.current;
    if (socket) {
      socket.emit('move_card', {
        boardId,
        cardId: draggableId,
        targetColumnId: destination.droppableId,
        targetIndex: destination.index,
      });
    }
  }

  async function handleAddColumn(e) {
    e.preventDefault();
    const t = newColumnTitle.trim();
    if (!t) return;
    try {
      await createColumn(boardId, t);
      setNewColumnTitle('');
      // The server will broadcast `column_added`; no manual state update needed.
    } catch (err) {
      setError(err.message);
    }
  }

  const exportHref = useMemo(() => exportBoardUrl(boardId), [boardId]);

  if (!displayName) {
    return <GuestNameModal onSubmit={handleSetName} />;
  }

  if (loading) {
    return <p className="loading">Loading board…</p>;
  }

  if (error && !board) {
    return (
      <div className="card-panel">
        <p className="error">{error}</p>
        <Link to="/">← Back to boards</Link>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="card-panel">
        <p>Board not found.</p>
        <Link to="/">← Back to boards</Link>
      </div>
    );
  }

  return (
    <div className="board-page">
      <div className="board-toolbar">
        <div className="board-info">
          <h1>{board.title}</h1>
          <span className={`conn-dot ${connected ? 'on' : 'off'}`} title={connected ? 'Connected' : 'Disconnected'}>
            ●
          </span>
          <span className="muted">You: {displayName}</span>
        </div>
        <div className="board-actions">
          <form onSubmit={handleAddColumn} className="add-column-form">
            <input
              type="text"
              placeholder="New column…"
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              maxLength={60}
              aria-label="New column title"
            />
            <button type="submit" disabled={!newColumnTitle.trim()}>
              + Column
            </button>
          </form>
          <a
            className="export-btn"
            href={exportHref}
            download={`${board.title}.csv`}
          >
            Export CSV
          </a>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns">
          {board.columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              onAddCard={handleAddCard}
              onAddComment={handleAddComment}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
