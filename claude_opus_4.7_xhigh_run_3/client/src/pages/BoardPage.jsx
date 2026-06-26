import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { api } from '../lib/api.js';
import { getDisplayName, setDisplayName as persistName } from '../lib/identity.js';
import { useBoardSocket } from '../hooks/useBoardSocket.js';
import Column from '../components/Column.jsx';
import AddColumn from '../components/AddColumn.jsx';
import NameModal from '../components/NameModal.jsx';
import CommentDrawer from '../components/CommentDrawer.jsx';

export default function BoardPage() {
  const { id } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [displayName, setDisplayNameState] = useState(getDisplayName());
  const [openCardId, setOpenCardId] = useState(null);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .getBoard(id)
      .then((data) => {
        if (!cancelled) setBoard(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleCardAdded = useCallback((card) => {
    setBoard((prev) => addCardToBoard(prev, card));
  }, []);

  const handleCardMoved = useCallback((payload) => {
    setBoard((prev) => moveCardInBoard(prev, payload));
  }, []);

  const handleCommentAdded = useCallback((comment) => {
    setBoard((prev) => addCommentToBoard(prev, comment));
  }, []);

  const socket = useBoardSocket(id, {
    enabled: Boolean(displayName) && Boolean(board),
    onCardAdded: handleCardAdded,
    onCardMoved: handleCardMoved,
    onCommentAdded: handleCommentAdded,
  });

  const openCard = useMemo(() => {
    if (!openCardId || !board) return null;
    for (const column of board.columns) {
      const found = column.cards.find((c) => c.id === openCardId);
      if (found) return found;
    }
    return null;
  }, [openCardId, board]);

  function handleSetName(name) {
    persistName(name);
    setDisplayNameState(name);
  }

  async function handleAddCard(columnId, content) {
    try {
      await socket.addCard({ columnId, content, authorName: displayName });
    } catch (err) {
      setError(`Failed to add card: ${err.message}`);
    }
  }

  async function handleAddComment(cardId, content) {
    try {
      await socket.addComment({ cardId, content, authorName: displayName });
    } catch (err) {
      setError(`Failed to add comment: ${err.message}`);
    }
  }

  async function handleAddColumn(title) {
    try {
      const column = await api.createColumn(id, title);
      setBoard((prev) => addColumnToBoard(prev, column));
    } catch (err) {
      setError(`Failed to add column: ${err.message}`);
    }
  }

  async function handleDragEnd(result) {
    const { draggableId, source, destination } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }
    // Optimistic update
    setBoard((prev) =>
      moveCardInBoard(prev, {
        cardId: draggableId,
        fromColumnId: source.droppableId,
        toColumnId: destination.droppableId,
        position: destination.index,
      }),
    );
    try {
      await socket.moveCard({
        cardId: draggableId,
        targetColumnId: destination.droppableId,
        targetPosition: destination.index,
      });
    } catch (err) {
      setError(`Failed to move card: ${err.message}`);
      // Refetch to recover authoritative state
      api.getBoard(id).then((data) => setBoard(data)).catch(() => {});
    }
  }

  function handleExport() {
    window.location.href = api.exportUrl(id);
  }

  if (loading) return <div className="loader">Loading board…</div>;
  if (error && !board) return <div className="error-banner">{error}</div>;
  if (!board) return <div className="error-banner">Board not found.</div>;

  if (!displayName) {
    return <NameModal onSubmit={handleSetName} />;
  }

  return (
    <div className="board-page">
      <div className="board-toolbar">
        <div className="left">
          <h1>{board.title}</h1>
          <span className="user-tag">
            Joined as <strong>{displayName}</strong> ·{' '}
            {socket.connected ? 'live' : 'connecting…'}
          </span>
        </div>
        <div className="actions">
          <button className="btn btn-secondary" type="button" onClick={handleExport}>
            Export CSV
          </button>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}
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
          <AddColumn onCreate={handleAddColumn} />
        </div>
      </DragDropContext>
      {openCard && (
        <CommentDrawer
          card={openCard}
          onClose={() => setOpenCardId(null)}
          onAddComment={handleAddComment}
        />
      )}
    </div>
  );
}

// --- pure reducers ---

function addColumnToBoard(prev, column) {
  if (!prev) return prev;
  if (prev.columns.some((c) => c.id === column.id)) return prev;
  return {
    ...prev,
    columns: [...prev.columns, { ...column, cards: column.cards || [] }],
  };
}

function addCardToBoard(prev, card) {
  if (!prev) return prev;
  return {
    ...prev,
    columns: prev.columns.map((col) => {
      if (col.id !== card.columnId) return col;
      if (col.cards.some((c) => c.id === card.id)) return col;
      const next = [...col.cards];
      const insertAt = Math.min(card.position ?? next.length, next.length);
      next.splice(insertAt, 0, { ...card, comments: card.comments || [] });
      return { ...col, cards: next };
    }),
  };
}

function moveCardInBoard(prev, { cardId, fromColumnId, toColumnId, position }) {
  if (!prev) return prev;
  let movingCard = null;
  let sourceColumnId = fromColumnId;
  if (!sourceColumnId) {
    for (const col of prev.columns) {
      const found = col.cards.find((c) => c.id === cardId);
      if (found) {
        movingCard = found;
        sourceColumnId = col.id;
        break;
      }
    }
  } else {
    const sourceCol = prev.columns.find((c) => c.id === sourceColumnId);
    movingCard = sourceCol?.cards.find((c) => c.id === cardId) || null;
  }
  if (!movingCard) return prev;

  const stripped = prev.columns.map((col) =>
    col.id === sourceColumnId
      ? { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
      : col,
  );

  return {
    ...prev,
    columns: stripped.map((col) => {
      if (col.id !== toColumnId) return col;
      const next = [...col.cards];
      const insertAt = Math.max(0, Math.min(position ?? next.length, next.length));
      next.splice(insertAt, 0, { ...movingCard, columnId: toColumnId, position });
      return { ...col, cards: next };
    }),
  };
}

function addCommentToBoard(prev, comment) {
  if (!prev) return prev;
  return {
    ...prev,
    columns: prev.columns.map((col) => ({
      ...col,
      cards: col.cards.map((card) => {
        if (card.id !== comment.cardId) return card;
        if (card.comments?.some((c) => c.id === comment.id)) return card;
        return { ...card, comments: [...(card.comments || []), comment] };
      }),
    })),
  };
}
