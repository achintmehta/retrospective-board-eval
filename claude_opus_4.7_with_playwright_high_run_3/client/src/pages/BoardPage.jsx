import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { api } from '../api.js';
import { getSocket } from '../socket.js';
import GuestAuthModal from '../components/GuestAuthModal.jsx';
import Column from '../components/Column.jsx';

const NAME_KEY = 'retro:displayName';

export default function BoardPage() {
  const { id: boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayName, setDisplayName] = useState(() => sessionStorage.getItem(NAME_KEY) || '');
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const refetch = useCallback(() => {
    return api.getBoard(boardId).then(setBoard);
  }, [boardId]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    refetch()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refetch]);

  useEffect(() => {
    if (!board || !displayName) return;
    const socket = getSocket();

    const join = () => socket.emit('join_board', { boardId }, () => {});
    if (socket.connected) join();
    socket.on('connect', () => {
      join();
      refetch().catch(() => {});
    });

    const onCardAdded = ({ card }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === card.columnId
              ? { ...col, cards: [...col.cards, card] }
              : col
          ),
        };
      });
    };
    const onCardMoved = ({ cardId, newColumnId, newPosition, oldColumnId }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        let movingCard = null;
        const withoutCard = prev.columns.map((col) => {
          if (col.id !== oldColumnId) return col;
          const cards = col.cards.filter((c) => {
            if (c.id === cardId) { movingCard = c; return false; }
            return true;
          });
          return { ...col, cards };
        });
        if (!movingCard) return prev;
        const updated = withoutCard.map((col) => {
          if (col.id !== newColumnId) return col;
          const cards = [...col.cards];
          const insertAt = Math.max(0, Math.min(newPosition, cards.length));
          cards.splice(insertAt, 0, { ...movingCard, columnId: newColumnId });
          return { ...col, cards };
        });
        return { ...prev, columns: updated };
      });
    };
    const onCommentAdded = ({ comment }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            cards: col.cards.map((c) =>
              c.id === comment.cardId
                ? { ...c, comments: [...c.comments, comment] }
                : c
            ),
          })),
        };
      });
    };

    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);

    return () => {
      socket.emit('leave_board', { boardId });
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
      socket.off('connect');
    };
  }, [board?.id, boardId, displayName, refetch]);

  const handleSetName = (name) => {
    sessionStorage.setItem(NAME_KEY, name);
    setDisplayName(name);
  };

  const handleAddCard = useCallback((columnId, content) => {
    const socket = getSocket();
    socket.emit('add_card', {
      boardId,
      columnId,
      content,
      authorName: displayName,
    });
  }, [boardId, displayName]);

  const handleAddComment = useCallback((cardId, content) => {
    const socket = getSocket();
    socket.emit('add_comment', {
      boardId,
      cardId,
      content,
      authorName: displayName,
    });
  }, [boardId, displayName]);

  const handleDragEnd = useCallback((result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    const socket = getSocket();
    socket.emit('move_card', {
      boardId,
      cardId: draggableId,
      newColumnId: destination.droppableId,
      newPosition: destination.index,
    });
  }, [boardId]);

  async function handleAddColumn(e) {
    e.preventDefault();
    const trimmed = newColumnTitle.trim();
    if (!trimmed) return;
    try {
      await api.createColumn(boardId, trimmed);
      setNewColumnTitle('');
      await refetch();
    } catch (e) {
      setError(e.message);
    }
  }

  const columns = useMemo(() => board?.columns || [], [board]);

  if (loading) return <p>Loading…</p>;
  if (error) return <p className="error">Error: {error}</p>;
  if (!board) return <p>Board not found.</p>;

  return (
    <div className="board-page">
      {!displayName && <GuestAuthModal onSubmit={handleSetName} />}

      <div className="board-toolbar">
        <h1>{board.title}</h1>
        <div className="board-toolbar-right">
          <span className="muted">You: {displayName || '—'}</span>
          <a
            className="button"
            href={api.exportUrl(boardId)}
            download
          >
            Export CSV
          </a>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board-columns">
          {columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              onAddCard={handleAddCard}
              onAddComment={handleAddComment}
            />
          ))}
          <form className="add-column" onSubmit={handleAddColumn}>
            <input
              type="text"
              placeholder="New column title…"
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              maxLength={100}
              aria-label="New column title"
            />
            <button type="submit" disabled={!newColumnTitle.trim()}>+ Column</button>
          </form>
        </div>
      </DragDropContext>
    </div>
  );
}
