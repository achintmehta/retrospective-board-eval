import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { api } from '../api.js';
import { getSocket } from '../socket.js';
import NamePrompt from '../components/NamePrompt.jsx';
import Column from '../components/Column.jsx';

const NAME_STORAGE_KEY = 'retro-board:display-name';

export default function BoardPage() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [displayName, setDisplayName] = useState(() =>
    sessionStorage.getItem(NAME_STORAGE_KEY) || ''
  );
  const [newColumn, setNewColumn] = useState('');
  const socketRef = useRef(null);

  // Load board data
  const reloadBoard = useCallback(async () => {
    try {
      const data = await api.getBoard(boardId);
      setBoard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    reloadBoard();
  }, [reloadBoard]);

  // Join socket room once we have a display name
  useEffect(() => {
    if (!displayName || !boardId) return;
    const socket = getSocket();
    socketRef.current = socket;
    socket.emit('join_board', { boardId, displayName });

    const handleConnect = () => {
      socket.emit('join_board', { boardId, displayName });
      reloadBoard();
    };
    socket.on('connect', handleConnect);

    socket.on('card_added', ({ columnId, card }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === columnId ? { ...col, cards: [...col.cards, card] } : col
          ),
        };
      });
    });

    socket.on('card_moved', ({ cardId, fromColumnId, toColumnId, toPosition }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        let movedCard = null;
        const columnsAfterRemoval = prev.columns.map((col) => {
          if (col.id !== fromColumnId) return col;
          const idx = col.cards.findIndex((c) => c.id === cardId);
          if (idx === -1) return col;
          movedCard = col.cards[idx];
          return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
        });
        if (!movedCard) return prev;
        return {
          ...prev,
          columns: columnsAfterRemoval.map((col) => {
            if (col.id !== toColumnId) return col;
            const cards = [...col.cards];
            cards.splice(toPosition, 0, movedCard);
            return { ...col, cards };
          }),
        };
      });
    });

    socket.on('comment_added', ({ cardId, comment }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            cards: col.cards.map((card) =>
              card.id === cardId
                ? { ...card, comments: [...card.comments, comment] }
                : card
            ),
          })),
        };
      });
    });

    socket.on('column_added', (column) => {
      setBoard((prev) => {
        if (!prev) return prev;
        if (prev.columns.some((c) => c.id === column.id)) return prev;
        return {
          ...prev,
          columns: [...prev.columns, { ...column, cards: [] }],
        };
      });
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('card_added');
      socket.off('card_moved');
      socket.off('comment_added');
      socket.off('column_added');
    };
  }, [displayName, boardId, reloadBoard]);

  function handleNameSubmit(name) {
    sessionStorage.setItem(NAME_STORAGE_KEY, name);
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
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }
    // Optimistic UI update
    setBoard((prev) => {
      if (!prev) return prev;
      const columns = prev.columns.map((c) => ({ ...c, cards: [...c.cards] }));
      const fromCol = columns.find((c) => c.id === source.droppableId);
      const toCol = columns.find((c) => c.id === destination.droppableId);
      if (!fromCol || !toCol) return prev;
      const [card] = fromCol.cards.splice(source.index, 1);
      toCol.cards.splice(destination.index, 0, card);
      return { ...prev, columns };
    });

    socketRef.current?.emit('move_card', {
      cardId: draggableId,
      toColumnId: destination.droppableId,
      toPosition: destination.index,
    });
  }

  async function handleAddColumn(e) {
    e.preventDefault();
    const trimmed = newColumn.trim();
    if (!trimmed) return;
    try {
      await api.createColumn(boardId, trimmed);
      setNewColumn('');
      // Server will broadcast `column_added`, but if we're offline before join, refetch.
    } catch (err) {
      setError(err.message);
    }
  }

  const exportHref = useMemo(() => api.exportUrl(boardId), [boardId]);

  if (loading) return <p>Loading board…</p>;
  if (error && !board) return <p className="error">{error}</p>;
  if (!board) return <p>Board not found</p>;

  return (
    <>
      {!displayName && <NamePrompt onSubmit={handleNameSubmit} />}
      <div className="board-page">
        <div className="board-toolbar">
          <div>
            <h1>{board.title}</h1>
            {displayName && (
              <p className="muted">Joined as {displayName}</p>
            )}
          </div>
          <div className="toolbar-actions">
            <form onSubmit={handleAddColumn} className="add-column-form">
              <input
                type="text"
                value={newColumn}
                onChange={(e) => setNewColumn(e.target.value)}
                placeholder="New column name"
                aria-label="New column name"
              />
              <button type="submit" className="btn btn-secondary" disabled={!newColumn.trim()}>
                Add column
              </button>
            </form>
            <a href={exportHref} className="btn btn-secondary" download>
              Export to CSV
            </a>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="board-columns">
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
    </>
  );
}
