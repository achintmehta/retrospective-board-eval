import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { api } from '../api.js';
import { getSocket, emitWithAck } from '../socket.js';
import { useGuestName } from '../hooks/useGuestName.js';
import GuestAuthModal from '../components/GuestAuthModal.jsx';
import Column from '../components/Column.jsx';
import AddColumnForm from '../components/AddColumnForm.jsx';

export default function BoardPage() {
  const { boardId } = useParams();
  const numericBoardId = Number(boardId);
  const { name, setName } = useGuestName();

  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joined, setJoined] = useState(false);
  const joiningRef = useRef(false);

  // Initial REST fetch — gives us the full snapshot to render. Subsequent
  // mutations arrive through socket events.
  const refetchBoard = useCallback(async () => {
    try {
      const data = await api.getBoard(numericBoardId);
      setBoard(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [numericBoardId]);

  useEffect(() => {
    refetchBoard();
  }, [refetchBoard]);

  // Manage the socket join handshake. We re-join whenever the name changes
  // (e.g., the user edits it) or after a reconnect.
  useEffect(() => {
    if (!name || !numericBoardId) return undefined;
    const socket = getSocket();
    let cancelled = false;

    async function join() {
      if (joiningRef.current) return;
      joiningRef.current = true;
      try {
        await emitWithAck('join_board', { boardId: numericBoardId, name });
        if (!cancelled) setJoined(true);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        joiningRef.current = false;
      }
    }

    join();

    function handleConnect() {
      // On reconnect, re-join the room and refetch in case we missed events.
      setJoined(false);
      join().then(() => refetchBoard());
    }

    socket.on('connect', handleConnect);
    return () => {
      cancelled = true;
      socket.off('connect', handleConnect);
    };
  }, [name, numericBoardId, refetchBoard]);

  // Subscribe to broadcasted events.
  useEffect(() => {
    const socket = getSocket();

    function onCardAdded(card) {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === card.column_id
              ? { ...col, cards: [...col.cards, { ...card, comments: card.comments || [] }] }
              : col
          ),
        };
      });
    }

    function onCardMoved({ cardId, fromColumnId, toColumnId, position }) {
      setBoard((prev) => {
        if (!prev) return prev;
        let movedCard = null;
        const columnsAfterRemoval = prev.columns.map((col) => {
          if (col.id !== fromColumnId) return col;
          const remaining = [];
          for (const c of col.cards) {
            if (c.id === cardId) movedCard = c;
            else remaining.push(c);
          }
          return { ...col, cards: remaining };
        });
        if (!movedCard) return prev;
        const movedUpdated = { ...movedCard, column_id: toColumnId, position };
        return {
          ...prev,
          columns: columnsAfterRemoval.map((col) => {
            if (col.id !== toColumnId) return col;
            const next = [...col.cards];
            const insertIndex = Math.min(Math.max(position, 0), next.length);
            next.splice(insertIndex, 0, movedUpdated);
            return { ...col, cards: next };
          }),
        };
      });
    }

    function onCommentAdded(comment) {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            cards: col.cards.map((card) =>
              card.id === comment.card_id
                ? { ...card, comments: [...(card.comments || []), comment] }
                : card
            ),
          })),
        };
      });
    }

    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);
    return () => {
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
    };
  }, []);

  function handleColumnCreated(column) {
    setBoard((prev) =>
      prev
        ? { ...prev, columns: [...prev.columns, { ...column, cards: [] }] }
        : prev
    );
  }

  async function handleDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }
    const cardId = Number(draggableId.replace('card-', ''));
    const toColumnId = Number(destination.droppableId.replace('column-', ''));
    const fromColumnId = Number(source.droppableId.replace('column-', ''));

    // Optimistic UI update; the broadcast will reconcile if anything differs.
    setBoard((prev) => {
      if (!prev) return prev;
      let movedCard = null;
      const columnsAfterRemoval = prev.columns.map((col) => {
        if (col.id !== fromColumnId) return col;
        const remaining = [];
        for (const c of col.cards) {
          if (c.id === cardId) movedCard = c;
          else remaining.push(c);
        }
        return { ...col, cards: remaining };
      });
      if (!movedCard) return prev;
      return {
        ...prev,
        columns: columnsAfterRemoval.map((col) => {
          if (col.id !== toColumnId) return col;
          const next = [...col.cards];
          const insertIndex = Math.min(Math.max(destination.index, 0), next.length);
          next.splice(insertIndex, 0, { ...movedCard, column_id: toColumnId });
          return { ...col, cards: next };
        }),
      };
    });

    try {
      await emitWithAck('move_card', {
        cardId,
        toColumnId,
        position: destination.index,
      });
    } catch (err) {
      setError(err.message);
      // Refetch to recover from a failed move.
      refetchBoard();
    }
  }

  if (!name) {
    return (
      <GuestAuthModal
        onSubmit={(value) => setName(value)}
      />
    );
  }

  if (loading) return <div className="page"><p>Loading board...</p></div>;
  if (error && !board) {
    return (
      <div className="page">
        <p className="error">{error}</p>
        <p><Link to="/">Back to boards</Link></p>
      </div>
    );
  }
  if (!board) return null;

  return (
    <div className="page page--board">
      <div className="board-toolbar">
        <div>
          <h2>{board.title}</h2>
          <span className="muted small">
            Joined as <strong>{name}</strong>
            {!joined && <span className="muted"> · connecting...</span>}
          </span>
        </div>
        <div className="row">
          <a className="button-secondary" href={api.exportUrl(board.id)}>
            Export to CSV
          </a>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board-columns">
          {board.columns.map((column) => (
            <Column key={column.id} column={column} />
          ))}
          <div className="add-column-slot">
            <AddColumnForm boardId={board.id} onCreated={handleColumnCreated} />
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
