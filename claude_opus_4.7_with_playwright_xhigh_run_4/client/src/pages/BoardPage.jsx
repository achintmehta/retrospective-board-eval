import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import NameModal from '../components/NameModal.jsx';
import ColumnView from '../components/ColumnView.jsx';
import { api } from '../lib/api.js';
import { getSocket } from '../lib/socket.js';
import { getDisplayName, setDisplayName } from '../lib/displayName.js';

export default function BoardPage() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [displayName, setName] = useState(getDisplayName());
  const [joined, setJoined] = useState(false);
  const [connected, setConnected] = useState(false);
  const [actionError, setActionError] = useState('');
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [addingColumn, setAddingColumn] = useState(false);
  const socketRef = useRef(null);

  // Initial load via REST (works even before the socket connects).
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

  // Wire up Socket.io once we have a display name AND the board exists.
  useEffect(() => {
    if (!displayName || !board) return undefined;
    const socket = getSocket();
    socketRef.current = socket;

    function handleConnect() {
      setConnected(true);
      socket.emit('join_board', { boardId, displayName }, (ack) => {
        if (ack?.ok) {
          setJoined(true);
          if (ack.board) setBoard(ack.board);
        } else if (ack?.error) {
          setActionError(ack.error);
        }
      });
    }
    function handleDisconnect() {
      setConnected(false);
      setJoined(false);
    }
    function onCardAdded(card) {
      setBoard((b) => (b ? { ...b, cards: [...b.cards, card] } : b));
    }
    function onCardMoved({ cardId, toColumnId, position }) {
      setBoard((b) => {
        if (!b) return b;
        const cards = b.cards.map((c) =>
          c.id === cardId ? { ...c, column_id: toColumnId, position } : c
        );
        return { ...b, cards };
      });
    }
    function onCommentAdded(comment) {
      setBoard((b) =>
        b ? { ...b, comments: [...b.comments, comment] } : b
      );
    }
    function onColumnAdded(column) {
      setBoard((b) =>
        b ? { ...b, columns: [...b.columns, column] } : b
      );
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);
    socket.on('column_added', onColumnAdded);

    if (socket.connected) handleConnect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
      socket.off('column_added', onColumnAdded);
      socket.emit('leave_board');
    };
  }, [boardId, displayName, board?.id]);

  const handleJoinName = useCallback((name) => {
    setDisplayName(name);
    setName(name);
  }, []);

  const cardsByColumn = useMemo(() => {
    const map = new Map();
    if (!board) return map;
    for (const col of board.columns) map.set(col.id, []);
    const sortedCards = [...board.cards].sort(
      (a, b) =>
        a.position - b.position ||
        (a.created_at || '').localeCompare(b.created_at || '')
    );
    for (const card of sortedCards) {
      if (!map.has(card.column_id)) map.set(card.column_id, []);
      map.get(card.column_id).push(card);
    }
    return map;
  }, [board]);

  const commentsByCard = useMemo(() => {
    const map = new Map();
    if (!board) return map;
    const sorted = [...board.comments].sort((a, b) =>
      (a.created_at || '').localeCompare(b.created_at || '')
    );
    for (const c of sorted) {
      if (!map.has(c.card_id)) map.set(c.card_id, []);
      map.get(c.card_id).push(c);
    }
    return map;
  }, [board]);

  const sortedColumns = useMemo(() => {
    if (!board) return [];
    return [...board.columns].sort(
      (a, b) =>
        a.position - b.position ||
        (a.created_at || '').localeCompare(b.created_at || '')
    );
  }, [board]);

  function addCard(columnId, content) {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('add_card', { columnId, content }, (ack) => {
      if (!ack?.ok && ack?.error) setActionError(ack.error);
    });
  }

  function addComment(cardId, content) {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('add_comment', { cardId, content }, (ack) => {
      if (!ack?.ok && ack?.error) setActionError(ack.error);
    });
  }

  function handleDragEnd(result) {
    if (!result.destination) return;
    const { draggableId, source, destination } = result;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }
    // Optimistic local update — server will broadcast confirming positions.
    setBoard((b) => {
      if (!b) return b;
      const cardsByCol = new Map();
      for (const col of b.columns) cardsByCol.set(col.id, []);
      const sorted = [...b.cards].sort(
        (a, b2) =>
          a.position - b2.position ||
          (a.created_at || '').localeCompare(b2.created_at || '')
      );
      for (const c of sorted) {
        if (!cardsByCol.has(c.column_id)) cardsByCol.set(c.column_id, []);
        cardsByCol.get(c.column_id).push(c);
      }
      const movingIdx = cardsByCol
        .get(source.droppableId)
        ?.findIndex((c) => c.id === draggableId);
      if (movingIdx == null || movingIdx < 0) return b;
      const [moving] = cardsByCol.get(source.droppableId).splice(movingIdx, 1);
      const dest = cardsByCol.get(destination.droppableId) || [];
      dest.splice(destination.index, 0, { ...moving, column_id: destination.droppableId });
      cardsByCol.set(destination.droppableId, dest);

      const nextCards = [];
      for (const [colId, list] of cardsByCol.entries()) {
        list.forEach((c, i) => nextCards.push({ ...c, column_id: colId, position: i }));
      }
      return { ...b, cards: nextCards };
    });

    const socket = socketRef.current;
    if (!socket) return;
    socket.emit(
      'move_card',
      {
        cardId: draggableId,
        toColumnId: destination.droppableId,
        toIndex: destination.index,
      },
      (ack) => {
        if (!ack?.ok && ack?.error) setActionError(ack.error);
      }
    );
  }

  async function handleAddColumn(e) {
    e.preventDefault();
    const trimmed = newColumnTitle.trim();
    if (!trimmed || addingColumn) return;
    setAddingColumn(true);
    try {
      await api.addColumn(boardId, trimmed);
      setNewColumnTitle('');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setAddingColumn(false);
    }
  }

  if (loadError) {
    return (
      <div className="empty-state">
        <h2>Could not load board</h2>
        <p>{loadError}</p>
        <Link to="/">Back to all boards</Link>
      </div>
    );
  }

  if (!board) {
    return <p className="muted">Loading board…</p>;
  }

  if (!displayName) {
    return <NameModal initialName="" onSubmit={handleJoinName} />;
  }

  return (
    <div className="board-page">
      <div className="board-toolbar">
        <div>
          <h1 className="board-title">{board.title}</h1>
          <p className="muted small">
            Joined as <strong>{displayName}</strong>
            {' · '}
            <span className={`status-dot ${connected ? 'is-on' : 'is-off'}`} aria-hidden />
            {connected ? (joined ? 'Live' : 'Connecting…') : 'Offline'}
          </p>
        </div>
        <div className="board-toolbar-actions">
          <a
            className="btn btn-secondary"
            href={api.exportUrl(board.id)}
            download
          >
            Export CSV
          </a>
        </div>
      </div>

      {actionError && (
        <p className="error" role="alert">
          {actionError}{' '}
          <button
            type="button"
            className="link-btn"
            onClick={() => setActionError('')}
          >
            dismiss
          </button>
        </p>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board-columns">
          {sortedColumns.map((col) => (
            <ColumnView
              key={col.id}
              column={col}
              cards={cardsByColumn.get(col.id) ?? []}
              commentsByCard={commentsByCard}
              onAddCard={addCard}
              onAddComment={addComment}
            />
          ))}
          <form className="column column-add" onSubmit={handleAddColumn}>
            <h3>Add column</h3>
            <input
              type="text"
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              placeholder="Column name"
              maxLength={100}
              aria-label="New column name"
            />
            <button type="submit" disabled={!newColumnTitle.trim() || addingColumn}>
              {addingColumn ? 'Adding…' : 'Add column'}
            </button>
          </form>
        </div>
      </DragDropContext>
    </div>
  );
}
