import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { io } from 'socket.io-client';
import { api } from '../api.js';
import { getDisplayName, setDisplayName } from '../session.js';
import GuestAuthModal from '../components/GuestAuthModal.jsx';
import Column from '../components/Column.jsx';

export default function BoardPage() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');
  const [displayName, setDisplayNameState] = useState(getDisplayName());
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const socketRef = useRef(null);

  const loadBoard = useCallback(async () => {
    try {
      const data = await api.getBoard(boardId);
      setBoard(data);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [boardId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // Socket setup: connect after the user has a display name.
  useEffect(() => {
    if (!displayName || !boardId) return;
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_board', { boardId });
    });

    // On reconnect, refetch board state to ensure consistency.
    socket.io.on('reconnect', () => {
      socket.emit('join_board', { boardId });
      loadBoard();
    });

    socket.on('card_added', (card) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === card.column_id
              ? { ...col, cards: [...(col.cards || []), { ...card, comments: card.comments || [] }] }
              : col
          ),
        };
      });
    });

    socket.on('card_moved', ({ cardId, fromColumnId, toColumnId, toIndex }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const fromCol = prev.columns.find((c) => c.id === fromColumnId);
        if (!fromCol) return prev;
        const card = (fromCol.cards || []).find((c) => c.id === cardId);
        if (!card) return prev;

        const columns = prev.columns.map((col) => {
          if (col.id === fromColumnId) {
            return { ...col, cards: (col.cards || []).filter((c) => c.id !== cardId) };
          }
          return col;
        });

        return {
          ...prev,
          columns: columns.map((col) => {
            if (col.id === toColumnId) {
              const next = [...(col.cards || [])];
              next.splice(toIndex, 0, { ...card, column_id: toColumnId });
              return { ...col, cards: next };
            }
            return col;
          }),
        };
      });
    });

    socket.on('comment_added', (comment) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            cards: (col.cards || []).map((card) =>
              card.id === comment.card_id
                ? { ...card, comments: [...(card.comments || []), comment] }
                : card
            ),
          })),
        };
      });
    });

    return () => {
      socket.emit('leave_board', { boardId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [displayName, boardId, loadBoard]);

  function handleDisplayNameSubmit(name) {
    setDisplayName(name);
    setDisplayNameState(name);
  }

  function handleAddCard(columnId, content) {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('add_card', {
      boardId,
      columnId,
      content,
      authorName: displayName,
    });
  }

  function handleAddComment(cardId, content) {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('add_comment', {
      boardId,
      cardId,
      content,
      authorName: displayName,
    });
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
    const socket = socketRef.current;
    if (!socket) return;

    // Optimistic UI
    setBoard((prev) => {
      if (!prev) return prev;
      const fromCol = prev.columns.find((c) => c.id === source.droppableId);
      if (!fromCol) return prev;
      const card = (fromCol.cards || [])[source.index];
      if (!card) return prev;
      const columns = prev.columns.map((col) =>
        col.id === source.droppableId
          ? { ...col, cards: col.cards.filter((_, i) => i !== source.index) }
          : col
      );
      return {
        ...prev,
        columns: columns.map((col) => {
          if (col.id === destination.droppableId) {
            const next = [...(col.cards || [])];
            next.splice(destination.index, 0, { ...card, column_id: destination.droppableId });
            return { ...col, cards: next };
          }
          return col;
        }),
      };
    });

    socket.emit('move_card', {
      boardId,
      cardId: draggableId,
      toColumnId: destination.droppableId,
      toIndex: destination.index,
    });
  }

  async function handleAddColumn(e) {
    e.preventDefault();
    const title = newColumnTitle.trim();
    if (!title) return;
    try {
      await api.createColumn(boardId, title);
      setNewColumnTitle('');
      await loadBoard();
    } catch (e) {
      setError(e.message);
    }
  }

  const columns = useMemo(() => board?.columns || [], [board]);

  if (!displayName) {
    return <GuestAuthModal onSubmit={handleDisplayNameSubmit} />;
  }

  if (error) {
    return (
      <div className="board-error">
        <p>{error}</p>
      </div>
    );
  }

  if (!board) {
    return <p>Loading board…</p>;
  }

  return (
    <div className="board">
      <div className="board-header">
        <h1>{board.title}</h1>
        <div className="board-actions">
          <span className="user-tag">You: {displayName}</span>
          <a
            className="export-btn"
            href={api.exportUrl(boardId)}
            download
          >
            Export to CSV
          </a>
        </div>
      </div>

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
          <form className="add-column" onSubmit={handleAddColumn}>
            <input
              type="text"
              placeholder="+ Add column"
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
            />
            <button type="submit" disabled={!newColumnTitle.trim()}>
              Add
            </button>
          </form>
        </div>
      </DragDropContext>
    </div>
  );
}
