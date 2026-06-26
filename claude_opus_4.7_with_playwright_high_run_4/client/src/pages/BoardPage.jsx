import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { api } from '../api.js';
import { getSocket } from '../socket.js';
import GuestAuthModal from '../components/GuestAuthModal.jsx';
import Column from '../components/Column.jsx';

const NAME_KEY = 'retro:displayName';

export default function BoardPage() {
  const { id: boardId } = useParams();
  const [displayName, setDisplayName] = useState(() => sessionStorage.getItem(NAME_KEY) || '');
  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const socketRef = useRef(null);

  const columns = board?.columns || [];

  // Fetch board
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getBoard(boardId)
      .then((data) => {
        if (!cancelled) {
          setBoard(data);
          setError('');
        }
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  // Socket setup and event handlers
  useEffect(() => {
    if (!displayName || !board) return;
    const socket = getSocket();
    socketRef.current = socket;

    const join = () =>
      socket.emit('join_board', { boardId, displayName }, (resp) => {
        if (resp?.ok) {
          setJoined(true);
          // Refetch to ensure consistency on reconnect.
          api.getBoard(boardId).then(setBoard).catch(() => {});
        } else {
          setError(resp?.error || 'Failed to join board');
        }
      });

    if (socket.connected) join();
    socket.on('connect', join);

    const onCardAdded = (card) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return updateColumns(prev, (col) => {
          if (col.id !== card.column_id) return col;
          if (col.cards.some((c) => c.id === card.id)) return col;
          return { ...col, cards: [...col.cards, { ...card, comments: [] }] };
        });
      });
    };

    const onCardMoved = ({ cardId, fromColumnId, toColumnId, toPosition }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        let movedCard = null;
        const stripped = prev.columns.map((col) => {
          if (col.id !== fromColumnId) return col;
          const idx = col.cards.findIndex((c) => c.id === cardId);
          if (idx === -1) return col;
          movedCard = col.cards[idx];
          return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
        });
        if (!movedCard) {
          // The card may already be in destination — search globally.
          for (const col of prev.columns) {
            const found = col.cards.find((c) => c.id === cardId);
            if (found) {
              movedCard = found;
              break;
            }
          }
          if (!movedCard) return prev;
        }
        const next = stripped.map((col) => {
          if (col.id !== toColumnId) return col;
          if (col.cards.some((c) => c.id === cardId)) return col;
          const nextCards = [...col.cards];
          const insertAt = Math.max(0, Math.min(toPosition, nextCards.length));
          nextCards.splice(insertAt, 0, { ...movedCard, column_id: toColumnId });
          return { ...col, cards: nextCards };
        });
        return { ...prev, columns: next };
      });
    };

    const onCommentAdded = (comment) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return updateColumns(prev, (col) => ({
          ...col,
          cards: col.cards.map((c) => {
            if (c.id !== comment.card_id) return c;
            if ((c.comments || []).some((x) => x.id === comment.id)) return c;
            return { ...c, comments: [...(c.comments || []), comment] };
          })
        }));
      });
    };

    const onColumnAdded = (column) => {
      setBoard((prev) => {
        if (!prev) return prev;
        if (prev.columns.some((c) => c.id === column.id)) return prev;
        return { ...prev, columns: [...prev.columns, { ...column, cards: [] }] };
      });
    };

    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);
    socket.on('column_added', onColumnAdded);

    return () => {
      socket.off('connect', join);
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
      socket.off('column_added', onColumnAdded);
    };
  }, [displayName, board?.id, boardId]); // depends on board being loaded

  function handleDisplayName(name) {
    sessionStorage.setItem(NAME_KEY, name);
    setDisplayName(name);
  }

  function handleAddCard(columnId, content) {
    socketRef.current?.emit('add_card', { columnId, content });
  }

  function handleAddComment(cardId, content) {
    socketRef.current?.emit('add_comment', { cardId, content });
  }

  function handleDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Optimistic update
    setBoard((prev) => {
      if (!prev) return prev;
      const fromCol = prev.columns.find((c) => c.id === source.droppableId);
      const toCol = prev.columns.find((c) => c.id === destination.droppableId);
      if (!fromCol || !toCol) return prev;
      const card = fromCol.cards.find((c) => c.id === draggableId);
      if (!card) return prev;
      const nextCols = prev.columns.map((col) => {
        if (col.id === fromCol.id) {
          return { ...col, cards: col.cards.filter((c) => c.id !== draggableId) };
        }
        return col;
      });
      const finalCols = nextCols.map((col) => {
        if (col.id !== toCol.id) return col;
        const cards = col.id === fromCol.id ? col.cards : [...col.cards];
        const insertAt = Math.max(0, Math.min(destination.index, cards.length));
        cards.splice(insertAt, 0, { ...card, column_id: toCol.id });
        return { ...col, cards };
      });
      return { ...prev, columns: finalCols };
    });

    socketRef.current?.emit('move_card', {
      cardId: draggableId,
      toColumnId: destination.droppableId,
      toPosition: destination.index
    });
  }

  async function handleAddColumn(e) {
    e.preventDefault();
    const title = newColumnTitle.trim();
    if (!title) return;
    try {
      await api.createColumn(boardId, title);
      setNewColumnTitle('');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p>Loading…</p>;
  if (error && !board) {
    return (
      <div className="card-panel">
        <p className="error">{error}</p>
        <Link to="/">Back to boards</Link>
      </div>
    );
  }
  if (!board) return null;

  if (!displayName) {
    return <GuestAuthModal onSubmit={handleDisplayName} />;
  }

  return (
    <div className="board-page">
      <div className="board-page-header">
        <div>
          <h1>{board.title}</h1>
          <p className="muted">
            Joined as <strong>{displayName}</strong>
            {joined ? '' : ' — connecting…'}
          </p>
        </div>
        <div className="board-actions">
          <a className="button" href={api.exportUrl(board.id)}>Export CSV</a>
        </div>
      </div>
      {error && <p className="error">{error}</p>}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns">
          {columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              onAddCard={handleAddCard}
              onAddComment={handleAddComment}
            />
          ))}
        </div>
      </DragDropContext>

      <form className="add-column-form" onSubmit={handleAddColumn}>
        <input
          type="text"
          placeholder="Add column…"
          value={newColumnTitle}
          onChange={(e) => setNewColumnTitle(e.target.value)}
          maxLength={120}
          aria-label="New column title"
        />
        <button type="submit" disabled={!newColumnTitle.trim()}>
          Add column
        </button>
      </form>
    </div>
  );
}

function updateColumns(prev, mapFn) {
  return { ...prev, columns: prev.columns.map(mapFn) };
}
