import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DragDropContext } from '@hello-pangea/dnd';
import { getBoard, createColumn, exportBoardUrl } from '../api.js';
import { getDisplayName, setDisplayName } from '../session.js';
import NamePrompt from '../components/NamePrompt.jsx';
import Column from '../components/Column.jsx';

export default function BoardPage() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState(getDisplayName());
  const [newColTitle, setNewColTitle] = useState('');
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  // --- Initial fetch ---
  const refresh = useCallback(async () => {
    try {
      const data = await getBoard(boardId);
      setBoard(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // --- Socket lifecycle ---
  useEffect(() => {
    if (!name) return;
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_board', { boardId }, (resp) => {
        if (resp?.ok && resp.board) setBoard(resp.board);
        else if (resp?.error) setError(resp.error);
      });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => setError(`Socket: ${err.message}`));

    socket.on('card_added', ({ card }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === card.column_id
              ? { ...col, cards: dedupeAppend(col.cards, { ...card, comments: [] }) }
              : col
          ),
        };
      });
    });

    socket.on('card_moved', ({ card, fromColumnId, toColumnId }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        // remove from any column then insert into destination at card.position
        let moving = null;
        const stripped = prev.columns.map((col) => {
          const idx = col.cards.findIndex((c) => c.id === card.id);
          if (idx !== -1) {
            moving = col.cards[idx];
            return { ...col, cards: col.cards.filter((c) => c.id !== card.id) };
          }
          return col;
        });
        const updated = stripped.map((col) => {
          if (col.id !== toColumnId) return col;
          const next = [...col.cards];
          const insertAt = Math.max(0, Math.min(card.position, next.length));
          next.splice(insertAt, 0, {
            ...(moving || {}),
            ...card,
            comments: moving?.comments || [],
          });
          return { ...col, cards: next };
        });
        return { ...prev, columns: updated };
      });
    });

    socket.on('comment_added', ({ comment }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            cards: col.cards.map((card) =>
              card.id === comment.card_id
                ? { ...card, comments: dedupeAppend(card.comments || [], comment) }
                : card
            ),
          })),
        };
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [boardId, name]);

  // --- Actions ---
  function handleSetName(n) {
    setDisplayName(n);
    setName(n);
  }

  function emitAck(event, payload) {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject(new Error('Not connected'));
      socketRef.current.emit(event, payload, (resp) => {
        if (resp?.ok) resolve(resp);
        else reject(new Error(resp?.error || 'Failed'));
      });
    });
  }

  async function onAddCard(columnId, content) {
    try {
      await emitAck('add_card', { columnId, content, authorName: name });
    } catch (e) {
      setError(e.message);
    }
  }

  async function onAddComment(cardId, content) {
    try {
      await emitAck('add_comment', { cardId, content, authorName: name });
    } catch (e) {
      setError(e.message);
    }
  }

  async function onAddColumn(e) {
    e.preventDefault();
    const trimmed = newColTitle.trim();
    if (!trimmed) return;
    try {
      await createColumn(boardId, trimmed);
      setNewColTitle('');
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  function onDragEnd(result) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
    // Optimistic local update
    setBoard((prev) => {
      if (!prev) return prev;
      let moving = null;
      const stripped = prev.columns.map((col) => {
        if (col.id !== source.droppableId) return col;
        const next = [...col.cards];
        [moving] = next.splice(source.index, 1);
        return { ...col, cards: next };
      });
      if (!moving) return prev;
      const updated = stripped.map((col) => {
        if (col.id !== destination.droppableId) return col;
        const next = [...col.cards];
        next.splice(destination.index, 0, moving);
        return { ...col, cards: next };
      });
      return { ...prev, columns: updated };
    });
    emitAck('move_card', {
      cardId: draggableId,
      toColumnId: destination.droppableId,
      toIndex: destination.index,
    }).catch((e) => {
      setError(e.message);
      refresh();
    });
  }

  if (!name) {
    return <NamePrompt onSubmit={handleSetName} />;
  }

  if (loading) return <p className="muted">Loading board…</p>;
  if (error && !board) return <p className="error">{error}</p>;
  if (!board) return <p className="muted">Board not found.</p>;

  return (
    <div className="board-page">
      <div className="board-toolbar">
        <div>
          <h2 className="board-title">{board.title}</h2>
          <span className="muted small">
            joined as <strong>{name}</strong>{' '}
            <span className={`pill ${connected ? 'ok' : 'warn'}`}>
              {connected ? 'live' : 'offline'}
            </span>
          </span>
        </div>
        <div className="board-actions">
          <a
            className="btn-link"
            href={exportBoardUrl(boardId)}
            target="_blank"
            rel="noreferrer"
          >
            Export CSV
          </a>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="columns-row">
          {board.columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              onAddCard={onAddCard}
              onAddComment={onAddComment}
            />
          ))}
          <form className="add-column-form" onSubmit={onAddColumn}>
            <input
              type="text"
              placeholder="New column…"
              value={newColTitle}
              onChange={(e) => setNewColTitle(e.target.value)}
              aria-label="New column title"
            />
            <button type="submit" disabled={!newColTitle.trim()}>
              + Column
            </button>
          </form>
        </div>
      </DragDropContext>
    </div>
  );
}

function dedupeAppend(list, item) {
  if (list.some((x) => x.id === item.id)) return list;
  return [...list, item];
}
