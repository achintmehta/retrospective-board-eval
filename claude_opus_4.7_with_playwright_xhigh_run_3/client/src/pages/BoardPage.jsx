import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { api } from '../api.js';
import { emitAck, getSocket } from '../socket.js';
import NamePrompt from '../components/NamePrompt.jsx';
import Column from '../components/Column.jsx';

const NAME_STORAGE_KEY = 'retro-board:display-name';

export default function BoardPage() {
  const { boardId } = useParams();
  const [displayName, setDisplayName] = useState(() => {
    try {
      return sessionStorage.getItem(NAME_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [showColumnForm, setShowColumnForm] = useState(false);
  const joinedRef = useRef(false);

  // Persist display name
  useEffect(() => {
    if (!displayName) return;
    try {
      sessionStorage.setItem(NAME_STORAGE_KEY, displayName);
    } catch {}
  }, [displayName]);

  // Load board + join the realtime room once we have a display name
  useEffect(() => {
    if (!displayName) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getBoard(boardId)
      .then((data) => {
        if (!cancelled) setBoard(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const socket = getSocket();

    const joinAndSync = () => {
      socket.emit('join_board', { boardId, displayName }, (resp) => {
        if (resp?.ok && resp.board && !cancelled) {
          setBoard(resp.board);
          joinedRef.current = true;
        }
      });
    };

    if (socket.connected) joinAndSync();
    socket.on('connect', joinAndSync);

    const onCardAdded = ({ columnId, card }) => {
      setBoard((current) => {
        if (!current) return current;
        return {
          ...current,
          columns: current.columns.map((col) =>
            col.id === columnId ? { ...col, cards: [...col.cards, card] } : col
          ),
        };
      });
    };

    const onCardMoved = ({ cardId, fromColumnId, toColumnId, toIndex }) => {
      setBoard((current) => {
        if (!current) return current;
        let movingCard = null;
        const columns = current.columns.map((col) => {
          if (col.id !== fromColumnId) return col;
          const remaining = [];
          for (const c of col.cards) {
            if (c.id === cardId) movingCard = c;
            else remaining.push(c);
          }
          return { ...col, cards: remaining };
        });
        if (!movingCard) {
          // already moved/created locally — try to find it anywhere
          for (const col of current.columns) {
            const found = col.cards.find((c) => c.id === cardId);
            if (found) movingCard = found;
          }
        }
        if (!movingCard) return current;
        return {
          ...current,
          columns: columns.map((col) => {
            if (col.id !== toColumnId) return col;
            const cards = col.cards.filter((c) => c.id !== cardId);
            const clamped = Math.max(0, Math.min(toIndex, cards.length));
            cards.splice(clamped, 0, movingCard);
            return { ...col, cards };
          }),
        };
      });
    };

    const onCommentAdded = ({ cardId, comment }) => {
      setBoard((current) => {
        if (!current) return current;
        return {
          ...current,
          columns: current.columns.map((col) => ({
            ...col,
            cards: col.cards.map((card) =>
              card.id === cardId
                ? { ...card, comments: [...(card.comments || []), comment] }
                : card
            ),
          })),
        };
      });
    };

    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);

    return () => {
      cancelled = true;
      socket.off('connect', joinAndSync);
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
      if (joinedRef.current) {
        socket.emit('leave_board', { boardId });
        joinedRef.current = false;
      }
    };
  }, [boardId, displayName]);

  const handleAddCard = useCallback(
    async (columnId, content) => {
      await emitAck('add_card', {
        boardId,
        columnId,
        content,
        authorName: displayName,
      });
    },
    [boardId, displayName]
  );

  const handleAddComment = useCallback(
    async (cardId, content) => {
      await emitAck('add_comment', {
        boardId,
        cardId,
        content,
        authorName: displayName,
      });
    },
    [boardId, displayName]
  );

  const handleDragEnd = useCallback(
    async (result) => {
      const { source, destination, draggableId } = result;
      if (!destination) return;
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }
      // Optimistic update
      setBoard((current) => {
        if (!current) return current;
        let moving = null;
        const columns = current.columns.map((col) => {
          if (col.id !== source.droppableId) return col;
          const remaining = [];
          for (const c of col.cards) {
            if (c.id === draggableId) moving = c;
            else remaining.push(c);
          }
          return { ...col, cards: remaining };
        });
        if (!moving) return current;
        return {
          ...current,
          columns: columns.map((col) => {
            if (col.id !== destination.droppableId) return col;
            const cards = [...col.cards];
            const clamped = Math.max(0, Math.min(destination.index, cards.length));
            cards.splice(clamped, 0, moving);
            return { ...col, cards };
          }),
        };
      });

      try {
        await emitAck('move_card', {
          boardId,
          cardId: draggableId,
          toColumnId: destination.droppableId,
          toIndex: destination.index,
        });
      } catch (err) {
        setError(err.message);
        // Refetch to recover
        api.getBoard(boardId).then(setBoard).catch(() => {});
      }
    },
    [boardId]
  );

  const handleAddColumn = useCallback(
    async (e) => {
      e.preventDefault();
      const title = newColumnTitle.trim();
      if (!title) return;
      try {
        await api.createColumn(boardId, title);
        const fresh = await api.getBoard(boardId);
        setBoard(fresh);
        setNewColumnTitle('');
        setShowColumnForm(false);
      } catch (err) {
        setError(err.message);
      }
    },
    [boardId, newColumnTitle]
  );

  const exportHref = useMemo(() => api.exportUrl(boardId), [boardId]);

  if (!displayName) {
    return <NamePrompt onSubmit={setDisplayName} />;
  }

  if (loading && !board) return <p className="status">Loading board…</p>;
  if (error && !board) {
    return (
      <div className="status">
        <p className="error">{error}</p>
        <Link to="/">← Back to boards</Link>
      </div>
    );
  }
  if (!board) return null;

  return (
    <div className="board-page">
      <div className="board-toolbar">
        <div>
          <h1>{board.title}</h1>
          <p className="muted">
            Joined as <strong>{displayName}</strong>
          </p>
        </div>
        <div className="toolbar-actions">
          <a className="button secondary" href={exportHref}>
            Export CSV
          </a>
          <button
            type="button"
            className="secondary"
            onClick={() => setShowColumnForm((v) => !v)}
          >
            {showColumnForm ? 'Cancel' : '+ Add column'}
          </button>
        </div>
      </div>

      {showColumnForm && (
        <form onSubmit={handleAddColumn} className="add-column-form">
          <input
            type="text"
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            placeholder="Column title"
            maxLength={60}
            autoFocus
            aria-label="New column title"
          />
          <button type="submit" disabled={!newColumnTitle.trim()}>
            Create column
          </button>
        </form>
      )}

      {error && <p className="error inline">{error}</p>}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns">
          {board.columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              onAddCard={handleAddCard}
              onAddComment={handleAddComment}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
