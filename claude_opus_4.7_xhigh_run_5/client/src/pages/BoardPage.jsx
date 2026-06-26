import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { api } from '../api.js';
import { getSocket } from '../socket.js';
import GuestAuthModal from '../components/GuestAuthModal.jsx';
import Column from '../components/Column.jsx';

const STORAGE_KEY = 'retro.displayName';

export default function BoardPage() {
  const { id: boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem(STORAGE_KEY) || ''
  );
  const [newColTitle, setNewColTitle] = useState('');
  const socketRef = useRef(null);

  const hasName = displayName.trim().length > 0;

  // Initial fetch
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    api
      .getBoard(boardId)
      .then((data) => alive && setBoard(data))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [boardId]);

  // Connect socket once we have a name + board
  useEffect(() => {
    if (!hasName || !boardId) return undefined;
    const socket = getSocket();
    socketRef.current = socket;

    const joinAndSync = () => {
      socket.emit('join_board', { boardId, displayName }, (resp) => {
        if (resp?.board) setBoard(resp.board);
        else if (resp?.error) setError(resp.error);
      });
    };
    joinAndSync();

    const onConnect = () => joinAndSync();
    const onCardAdded = ({ card }) => {
      setBoard((prev) => mergeCard(prev, card));
    };
    const onCardMoved = ({ card }) => {
      setBoard((prev) => mergeCard(prev, card));
    };
    const onCommentAdded = ({ comment }) => {
      setBoard((prev) => mergeComment(prev, comment));
    };

    socket.on('connect', onConnect);
    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);

    return () => {
      socket.off('connect', onConnect);
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
    };
  }, [boardId, displayName, hasName]);

  const handleSetName = useCallback((name) => {
    localStorage.setItem(STORAGE_KEY, name);
    setDisplayName(name);
  }, []);

  const handleAddCard = useCallback(
    (columnId, content, done) => {
      const socket = socketRef.current;
      if (!socket) {
        done?.();
        return;
      }
      socket.emit(
        'add_card',
        { columnId, content, authorName: displayName },
        (resp) => {
          if (resp?.error) setError(resp.error);
          done?.();
        }
      );
    },
    [displayName]
  );

  const handleAddComment = useCallback(
    (cardId, content) => {
      const socket = socketRef.current;
      if (!socket) return;
      socket.emit(
        'add_comment',
        { cardId, content, authorName: displayName },
        (resp) => {
          if (resp?.error) setError(resp.error);
        }
      );
    },
    [displayName]
  );

  const handleAddColumn = useCallback(
    async (e) => {
      e.preventDefault();
      const trimmed = newColTitle.trim();
      if (!trimmed) return;
      try {
        const col = await api.createColumn(boardId, trimmed);
        setBoard((prev) =>
          prev ? { ...prev, columns: [...prev.columns, col] } : prev
        );
        setNewColTitle('');
        // Notify others via socket by re-emitting join to refresh? Simpler: rely on REST + manual refresh.
        // For real-time column updates we could add a socket event; for now broadcast a soft refresh.
        socketRef.current?.emit('join_board', { boardId, displayName });
      } catch (err) {
        setError(err.message);
      }
    },
    [boardId, displayName, newColTitle]
  );

  const handleDragEnd = useCallback(
    (result) => {
      if (!result.destination || !board) return;
      const { draggableId, source, destination } = result;
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }
      const toColumnId = destination.droppableId;
      // Compute target position based on cards in destination column (excluding the moved one)
      const destCards = board.cards
        .filter(
          (c) => c.column_id === toColumnId && c.id !== draggableId
        )
        .sort((a, b) => a.position - b.position || a.created_at - b.created_at);
      const before = destCards[destination.index - 1];
      const after = destCards[destination.index];
      let newPosition;
      if (!before && !after) newPosition = 0;
      else if (!before) newPosition = after.position - 1;
      else if (!after) newPosition = before.position + 1;
      else newPosition = (before.position + after.position) / 2;

      // Optimistic update
      setBoard((prev) =>
        prev
          ? {
              ...prev,
              cards: prev.cards.map((c) =>
                c.id === draggableId
                  ? { ...c, column_id: toColumnId, position: newPosition }
                  : c
              ),
            }
          : prev
      );

      socketRef.current?.emit(
        'move_card',
        { cardId: draggableId, toColumnId, position: newPosition },
        (resp) => {
          if (resp?.error) setError(resp.error);
        }
      );
    },
    [board]
  );

  const commentsByCard = useMemo(() => {
    const map = new Map();
    if (!board) return map;
    for (const c of board.comments) {
      if (!map.has(c.card_id)) map.set(c.card_id, []);
      map.get(c.card_id).push(c);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.created_at - b.created_at);
    }
    return map;
  }, [board]);

  const cardsByColumn = useMemo(() => {
    const map = new Map();
    if (!board) return map;
    for (const col of board.columns) map.set(col.id, []);
    for (const card of board.cards) {
      if (!map.has(card.column_id)) map.set(card.column_id, []);
      map.get(card.column_id).push(card);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.position - b.position || a.created_at - b.created_at);
    }
    return map;
  }, [board]);

  if (loading) return <p className="centered">Loading board...</p>;
  if (error && !board) {
    return (
      <div className="centered">
        <p className="error">{error}</p>
        <Link to="/">Back to boards</Link>
      </div>
    );
  }
  if (!board) {
    return (
      <div className="centered">
        <p>Board not found.</p>
        <Link to="/">Back to boards</Link>
      </div>
    );
  }

  if (!hasName) {
    return <GuestAuthModal onSubmit={handleSetName} />;
  }

  return (
    <div className="board-page">
      <header className="board-toolbar">
        <div>
          <h2>{board.title}</h2>
          <span className="muted">
            Joined as <strong>{displayName}</strong>
          </span>
        </div>
        <div className="toolbar-actions">
          <a className="btn-link" href={api.exportUrl(board.id)}>
            Export CSV
          </a>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board-columns">
          {board.columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              cards={cardsByColumn.get(col.id) ?? []}
              commentsByCard={commentsByCard}
              onAddCard={handleAddCard}
              onAddComment={handleAddComment}
            />
          ))}

          <form className="column add-column" onSubmit={handleAddColumn}>
            <h3>New column</h3>
            <input
              type="text"
              value={newColTitle}
              onChange={(e) => setNewColTitle(e.target.value)}
              placeholder="e.g. Action Items"
              maxLength={80}
            />
            <button type="submit" disabled={!newColTitle.trim()}>
              Add column
            </button>
          </form>
        </div>
      </DragDropContext>
    </div>
  );
}

function mergeCard(board, card) {
  if (!board) return board;
  const existing = board.cards.find((c) => c.id === card.id);
  const cards = existing
    ? board.cards.map((c) => (c.id === card.id ? card : c))
    : [...board.cards, card];
  return { ...board, cards };
}

function mergeComment(board, comment) {
  if (!board) return board;
  if (board.comments.some((c) => c.id === comment.id)) return board;
  return { ...board, comments: [...board.comments, comment] };
}
