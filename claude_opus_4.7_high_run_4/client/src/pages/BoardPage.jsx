import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { api } from '../api.js';
import { createSocket } from '../socket.js';
import { getDisplayName, setDisplayName } from '../session.js';
import GuestAuthModal from '../components/GuestAuthModal.jsx';
import Column from '../components/Column.jsx';
import CardModal from '../components/CardModal.jsx';

export default function BoardPage() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState(() => getDisplayName(boardId));
  const [connected, setConnected] = useState(false);
  const [openCardId, setOpenCardId] = useState(null);
  const [newColumn, setNewColumn] = useState('');
  const socketRef = useRef(null);

  // ---- Fetch board on load (REST first; socket reconciles state). ---------
  useEffect(() => {
    setLoading(true);
    api
      .getBoard(boardId)
      .then(setBoard)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [boardId]);

  // ---- Socket lifecycle. --------------------------------------------------
  useEffect(() => {
    if (!name) return;
    const socket = createSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_board', { boardId, name }, (res) => {
        if (res?.ok && res.board) {
          // Server is the source of truth; resync on every join/reconnect.
          setBoard(res.board);
        }
      });
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('card_added', (card) => {
      setBoard((prev) =>
        prev ? applyCardAdded(prev, card) : prev
      );
    });
    socket.on('card_moved', (evt) => {
      setBoard((prev) => (prev ? applyCardMoved(prev, evt) : prev));
    });
    socket.on('comment_added', (comment) => {
      setBoard((prev) => (prev ? applyCommentAdded(prev, comment) : prev));
    });
    socket.on('column_added', (column) => {
      setBoard((prev) => (prev ? applyColumnAdded(prev, column) : prev));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [boardId, name]);

  const handleJoin = useCallback(
    (chosen) => {
      setDisplayName(boardId, chosen);
      setName(chosen);
    },
    [boardId]
  );

  const addCard = useCallback((columnId, content) => {
    socketRef.current?.emit('add_card', { columnId, content });
  }, []);

  const addComment = useCallback((cardId, content) => {
    socketRef.current?.emit('add_comment', { cardId, content });
  }, []);

  const onDragEnd = useCallback(
    (result) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }
      // Optimistic local update for snappier UX; server broadcast will
      // overwrite us shortly via applyCardMoved (idempotent).
      setBoard((prev) =>
        prev
          ? applyCardMoved(prev, {
              cardId: draggableId,
              fromColumnId: source.droppableId,
              toColumnId: destination.droppableId,
              toPosition: destination.index,
            })
          : prev
      );
      socketRef.current?.emit('move_card', {
        cardId: draggableId,
        toColumnId: destination.droppableId,
        toPosition: destination.index,
      });
    },
    []
  );

  async function addColumn(e) {
    e.preventDefault();
    const trimmed = newColumn.trim();
    if (!trimmed) return;
    try {
      await api.createColumn(boardId, trimmed);
      setNewColumn('');
      // Server broadcasts column_added which updates state.
    } catch (err) {
      setError(err.message);
    }
  }

  const openCard = useMemo(() => {
    if (!board || !openCardId) return null;
    for (const col of board.columns) {
      const found = col.cards.find((c) => c.id === openCardId);
      if (found) return found;
    }
    return null;
  }, [board, openCardId]);

  if (loading) {
    return (
      <div className="app-shell">
        <p className="muted">Loading board…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="app-shell">
        <p style={{ color: 'var(--danger)' }}>{error}</p>
        <p><Link to="/">← Back to boards</Link></p>
      </div>
    );
  }
  if (!board) return null;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <Link to="/" className="muted">← All boards</Link>
          <h1 style={{ marginTop: '0.25rem' }}>{board.title}</h1>
        </div>
        <div className="actions">
          {name && (
            <span className="muted">
              Joined as <strong style={{ color: 'var(--text)' }}>{name}</strong>
            </span>
          )}
          <span className={`status-pill${connected ? ' connected' : ''}`}>
            <span className="dot" />
            {connected ? 'Live' : 'Disconnected'}
          </span>
          <a
            href={api.exportUrl(boardId)}
            download
            style={{ textDecoration: 'none' }}
          >
            <button type="button">Export CSV</button>
          </a>
        </div>
      </header>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="board-columns">
          {board.columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              onAddCard={addCard}
              onOpenCard={(c) => setOpenCardId(c.id)}
            />
          ))}
          <form className="add-column" onSubmit={addColumn}>
            <strong>Add a column</strong>
            <input
              placeholder="e.g. Action Items"
              value={newColumn}
              onChange={(e) => setNewColumn(e.target.value)}
            />
            <button
              type="submit"
              className="primary"
              disabled={!newColumn.trim()}
            >
              Add column
            </button>
          </form>
        </div>
      </DragDropContext>

      {!name && <GuestAuthModal onSubmit={handleJoin} />}
      {openCard && (
        <CardModal
          card={openCard}
          onClose={() => setOpenCardId(null)}
          onAddComment={addComment}
        />
      )}
    </div>
  );
}

// ---- Pure reducers ---------------------------------------------------------

function applyCardAdded(board, card) {
  return {
    ...board,
    columns: board.columns.map((col) =>
      col.id === card.column_id
        ? { ...col, cards: upsertSorted(col.cards, card) }
        : col
    ),
  };
}

function applyColumnAdded(board, column) {
  if (board.columns.some((c) => c.id === column.id)) return board;
  return {
    ...board,
    columns: [...board.columns, { ...column, cards: column.cards || [] }],
  };
}

function applyCommentAdded(board, comment) {
  return {
    ...board,
    columns: board.columns.map((col) => ({
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
}

function applyCardMoved(board, { cardId, toColumnId, toPosition }) {
  let movedCard = null;
  const columnsWithoutCard = board.columns.map((col) => {
    const idx = col.cards.findIndex((c) => c.id === cardId);
    if (idx === -1) return col;
    movedCard = col.cards[idx];
    return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
  });
  if (!movedCard) return board;
  const updatedCard = { ...movedCard, column_id: toColumnId };

  return {
    ...board,
    columns: columnsWithoutCard.map((col) => {
      if (col.id !== toColumnId) return col;
      const next = col.cards.slice();
      const clamped = Math.max(0, Math.min(toPosition, next.length));
      next.splice(clamped, 0, updatedCard);
      return { ...col, cards: next };
    }),
  };
}

function upsertSorted(cards, incoming) {
  if (cards.some((c) => c.id === incoming.id)) return cards;
  const next = [...cards, incoming];
  next.sort((a, b) => a.position - b.position);
  return next;
}
