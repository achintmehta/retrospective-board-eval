import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { api } from '../api.js';
import { getSocket } from '../socket.js';
import { getDisplayName, setDisplayName } from '../guestSession.js';
import GuestAuthModal from '../components/GuestAuthModal.jsx';
import BoardColumn from '../components/BoardColumn.jsx';
import AddColumnForm from '../components/AddColumnForm.jsx';

export default function BoardPage() {
  const { id: boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [displayName, setName] = useState(getDisplayName());
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  // Initial fetch + refetch on reconnect
  const refresh = useCallback(async () => {
    try {
      const { board } = await api.getBoard(boardId);
      setBoard(board);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  // Socket lifecycle: join room when name + boardId are available
  useEffect(() => {
    if (!displayName) return;
    const socket = getSocket();
    socketRef.current = socket;

    function join() {
      socket.emit('join_board', { boardId, displayName }, () => {});
    }

    function onConnect() {
      setConnected(true);
      join();
      // Always refetch on (re)connect to recover from missed events
      refresh();
    }
    function onDisconnect() {
      setConnected(false);
    }

    function onCardAdded({ card }) {
      setBoard((b) => {
        if (!b) return b;
        if (b.cards.some((c) => c.id === card.id)) return b;
        return { ...b, cards: [...b.cards, card] };
      });
    }

    function onCardMoved({ card }) {
      setBoard((b) => {
        if (!b) return b;
        const cards = b.cards.map((c) => (c.id === card.id ? card : c));
        if (!cards.some((c) => c.id === card.id)) cards.push(card);
        return { ...b, cards };
      });
    }

    function onCommentAdded({ comment }) {
      setBoard((b) => {
        if (!b) return b;
        if (b.comments.some((c) => c.id === comment.id)) return b;
        return { ...b, comments: [...b.comments, comment] };
      });
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);

    if (socket.connected) {
      setConnected(true);
      join();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
    };
  }, [boardId, displayName, refresh]);

  function handleNameSubmit(name) {
    setDisplayName(name);
    setName(name);
  }

  const { columns, cardsByColumn, commentsByCard } = useMemo(() => {
    if (!board) {
      return { columns: [], cardsByColumn: {}, commentsByCard: {} };
    }
    const byCol = {};
    for (const col of board.columns) byCol[col.id] = [];
    for (const card of board.cards) {
      if (!byCol[card.column_id]) byCol[card.column_id] = [];
      byCol[card.column_id].push(card);
    }
    for (const colId of Object.keys(byCol)) {
      byCol[colId].sort((a, b) => a.position - b.position);
    }
    const byCard = {};
    for (const cm of board.comments) {
      if (!byCard[cm.card_id]) byCard[cm.card_id] = [];
      byCard[cm.card_id].push(cm);
    }
    return { columns: board.columns, cardsByColumn: byCol, commentsByCard: byCard };
  }, [board]);

  function handleAddCard(columnId, content) {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('add_card', { columnId, content }, (resp) => {
      if (resp?.error) setError(resp.error);
    });
  }

  function handleAddComment(cardId, content) {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('add_comment', { cardId, content }, (resp) => {
      if (resp?.error) setError(resp.error);
    });
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

    // Optimistic UI update so the dragged card snaps into place immediately;
    // the server's broadcast will reconcile any drift.
    setBoard((b) => {
      if (!b) return b;
      const cards = b.cards.map((c) => ({ ...c }));
      const movedIdx = cards.findIndex((c) => c.id === draggableId);
      if (movedIdx === -1) return b;
      const moved = cards[movedIdx];
      moved.column_id = destination.droppableId;

      // Rebuild positions for source and destination columns
      const grouped = {};
      for (const c of cards) {
        if (!grouped[c.column_id]) grouped[c.column_id] = [];
        grouped[c.column_id].push(c);
      }
      for (const colId of Object.keys(grouped)) {
        grouped[colId].sort((a, b) => a.position - b.position);
      }

      const dest = grouped[destination.droppableId] || [];
      const without = dest.filter((c) => c.id !== draggableId);
      without.splice(destination.index, 0, moved);
      without.forEach((c, idx) => (c.position = idx));

      if (source.droppableId !== destination.droppableId) {
        const src = (grouped[source.droppableId] || []).filter(
          (c) => c.id !== draggableId
        );
        src.forEach((c, idx) => (c.position = idx));
      }

      return { ...b, cards };
    });

    const socket = socketRef.current;
    if (socket) {
      socket.emit(
        'move_card',
        {
          cardId: draggableId,
          toColumnId: destination.droppableId,
          toIndex: destination.index,
        },
        (resp) => {
          if (resp?.error) {
            setError(resp.error);
            refresh(); // roll back on failure
          }
        }
      );
    }
  }

  async function handleAddColumn(title) {
    try {
      await api.createColumn(boardId, title);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!displayName) {
    return <GuestAuthModal onSubmit={handleNameSubmit} />;
  }

  if (loading) {
    return <div className="empty-state">Loading board…</div>;
  }

  if (!board) {
    return (
      <div className="empty-state">
        <h2>Board not found</h2>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="board-page">
      <div className="board-toolbar">
        <div>
          <h1 className="board-title">{board.title}</h1>
          <div className="board-meta">
            Signed in as <strong>{displayName}</strong> ·{' '}
            <span className={connected ? 'status-online' : 'status-offline'}>
              {connected ? 'Live' : 'Reconnecting…'}
            </span>
          </div>
        </div>
        <div className="board-actions">
          <a
            className="button"
            href={api.exportUrl(boardId)}
            download
          >
            Export to CSV
          </a>
        </div>
      </div>
      {error && <p className="error">{error}</p>}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board-columns">
          {columns.map((col) => (
            <BoardColumn
              key={col.id}
              column={col}
              cards={cardsByColumn[col.id] || []}
              commentsByCard={commentsByCard}
              onAddCard={handleAddCard}
              onAddComment={handleAddComment}
            />
          ))}
          <div className="board-column add-column-slot">
            <AddColumnForm onAdd={handleAddColumn} />
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
