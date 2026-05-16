import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import type { Socket } from 'socket.io-client';
import { api } from '../api';
import { disconnectSocket, getSocket } from '../socket';
import type { BoardColumn, BoardWithChildren, Card, Comment } from '../types';
import { GuestNameModal } from '../components/GuestNameModal';
import { Column } from '../components/Column';

const NAME_STORAGE_KEY = 'retro-board:displayName';

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const [board, setBoard] = useState<BoardWithChildren | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem(NAME_STORAGE_KEY) : null
  );
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const socketRef = useRef<Socket | null>(null);

  const fetchBoard = useCallback(async () => {
    if (!boardId) return;
    try {
      const data = await api.getBoard(boardId);
      setBoard(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  useEffect(() => {
    if (!boardId || !displayName) return;
    const socket = getSocket();
    socketRef.current = socket;

    socket.emit('join_board', { boardId, displayName });

    const handleReconnect = () => {
      socket.emit('join_board', { boardId, displayName });
      fetchBoard();
    };

    const handleCardAdded = (payload: { columnId: string; card: Card }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === payload.columnId
              ? { ...col, cards: [...col.cards, { ...payload.card, comments: [] }] }
              : col
          ),
        };
      });
    };

    const handleCardMoved = (payload: {
      card: Card;
      fromColumnId: string;
      toColumnId: string;
    }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        // Build columns with the card removed from any old position then inserted into target.
        const columns = prev.columns.map((col) => {
          let cards = col.cards;
          if (col.id === payload.fromColumnId || col.id === payload.toColumnId) {
            cards = cards.filter((c) => c.id !== payload.card.id);
          }
          if (col.id === payload.toColumnId) {
            const existingComments =
              prev.columns
                .flatMap((c) => c.cards)
                .find((c) => c.id === payload.card.id)?.comments ?? [];
            const insertedCard: Card = {
              ...payload.card,
              comments: existingComments,
            };
            const next = [...cards];
            const insertAt = Math.max(
              0,
              Math.min(payload.card.position, next.length)
            );
            next.splice(insertAt, 0, insertedCard);
            cards = next;
          }
          return { ...col, cards };
        });
        return { ...prev, columns };
      });
    };

    const handleCommentAdded = (payload: { cardId: string; comment: Comment }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            cards: col.cards.map((c) =>
              c.id === payload.cardId
                ? { ...c, comments: [...c.comments, payload.comment] }
                : c
            ),
          })),
        };
      });
    };

    socket.on('connect', handleReconnect);
    socket.on('card_added', handleCardAdded);
    socket.on('card_moved', handleCardMoved);
    socket.on('comment_added', handleCommentAdded);

    return () => {
      socket.off('connect', handleReconnect);
      socket.off('card_added', handleCardAdded);
      socket.off('card_moved', handleCardMoved);
      socket.off('comment_added', handleCommentAdded);
      socket.emit('leave_board', { boardId });
    };
  }, [boardId, displayName, fetchBoard]);

  useEffect(() => {
    return () => {
      // Disconnect when leaving the board page entirely.
      disconnectSocket();
    };
  }, []);

  function handleNameSubmit(name: string) {
    sessionStorage.setItem(NAME_STORAGE_KEY, name);
    setDisplayName(name);
  }

  function handleAddCard(columnId: string, content: string) {
    if (!boardId || !displayName) return;
    socketRef.current?.emit('add_card', {
      boardId,
      columnId,
      content,
      authorName: displayName,
    });
  }

  function handleAddComment(cardId: string, content: string) {
    if (!boardId || !displayName) return;
    socketRef.current?.emit('add_comment', {
      boardId,
      cardId,
      content,
      authorName: displayName,
    });
  }

  function handleDragEnd(result: DropResult) {
    if (!boardId || !board) return;
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Optimistic local reorder
    setBoard((prev) => {
      if (!prev) return prev;
      const sourceColIdx = prev.columns.findIndex(
        (c) => c.id === source.droppableId
      );
      const destColIdx = prev.columns.findIndex(
        (c) => c.id === destination.droppableId
      );
      if (sourceColIdx === -1 || destColIdx === -1) return prev;

      const columns = prev.columns.map((c) => ({ ...c, cards: [...c.cards] }));
      const [moved] = columns[sourceColIdx].cards.splice(source.index, 1);
      if (!moved) return prev;
      columns[destColIdx].cards.splice(destination.index, 0, moved);
      return { ...prev, columns };
    });

    socketRef.current?.emit('move_card', {
      boardId,
      cardId: draggableId,
      toColumnId: destination.droppableId,
      toPosition: destination.index,
    });
  }

  async function handleAddColumn(e: React.FormEvent) {
    e.preventDefault();
    if (!boardId) return;
    const trimmed = newColumnTitle.trim();
    if (!trimmed) return;
    setAddingColumn(true);
    try {
      const col = await api.createColumn(boardId, trimmed);
      setBoard((prev) =>
        prev
          ? {
              ...prev,
              columns: [...prev.columns, { ...(col as BoardColumn), cards: [] }],
            }
          : prev
      );
      setNewColumnTitle('');
    } catch (e) {
      setError(String(e));
    } finally {
      setAddingColumn(false);
    }
  }

  const exportHref = useMemo(
    () => (boardId ? api.exportUrl(boardId) : '#'),
    [boardId]
  );

  if (loading) return <div className="page"><p>Loading board…</p></div>;
  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!board) return <div className="page"><p>Board not found.</p></div>;

  return (
    <div className="page board-page">
      {!displayName && <GuestNameModal onSubmit={handleNameSubmit} />}

      <header className="board-header">
        <div>
          <Link to="/" className="back-link">← All boards</Link>
          <h1>{board.title}</h1>
          <p className="muted">
            Joined as <strong>{displayName ?? '…'}</strong>
          </p>
        </div>
        <div className="board-actions">
          <a className="button" href={exportHref}>Export to CSV</a>
        </div>
      </header>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board-grid">
          {board.columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              onAddCard={handleAddCard}
              onAddComment={handleAddComment}
            />
          ))}
          <div className="column add-column">
            <form onSubmit={handleAddColumn} className="add-column-form">
              <input
                type="text"
                placeholder="New column title…"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                disabled={addingColumn}
              />
              <button type="submit" disabled={addingColumn || !newColumnTitle.trim()}>
                Add column
              </button>
            </form>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
