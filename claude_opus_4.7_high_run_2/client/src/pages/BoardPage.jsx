import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { createColumn, exportBoardUrl, getBoard } from '../api.js';
import { getDisplayName, setDisplayName } from '../session.js';
import { getSocket } from '../socket.js';
import GuestAuthModal from '../components/GuestAuthModal.jsx';
import Column from '../components/Column.jsx';

export default function BoardPage() {
  const { boardId } = useParams();
  const [name, setName] = useState(getDisplayName());
  const [board, setBoard] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newColTitle, setNewColTitle] = useState('');
  const socketRef = useRef(null);

  // Join board over socket + sync state on (re)connect
  useEffect(() => {
    if (!name) return;
    const socket = getSocket();
    socketRef.current = socket;

    function join() {
      socket.emit('join_board', { boardId }, (resp) => {
        if (!resp?.ok) {
          setError(resp?.error || 'Failed to join board');
          setLoading(false);
          return;
        }
        setBoard(resp.board);
        setLoading(false);
      });
    }

    join();
    socket.on('connect', join);

    const onCardAdded = (card) => {
      setBoard((prev) => addCard(prev, card));
    };
    const onCardMoved = (evt) => {
      setBoard((prev) => moveCard(prev, evt));
    };
    const onCommentAdded = (comment) => {
      setBoard((prev) => addComment(prev, comment));
    };
    const onColumnAdded = (column) => {
      setBoard((prev) => addColumn(prev, column));
    };

    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);
    socket.on('column_added', onColumnAdded);

    return () => {
      socket.emit('leave_board', { boardId });
      socket.off('connect', join);
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
      socket.off('column_added', onColumnAdded);
    };
  }, [boardId, name]);

  // Initial REST fallback if socket join failed
  useEffect(() => {
    if (!name) {
      // We still need to know the board exists; show modal first.
      getBoard(boardId).catch((e) => setError(e.message));
    }
  }, [name, boardId]);

  function handleJoin(displayName) {
    setDisplayName(displayName);
    setName(displayName);
  }

  function handleAddCard(columnId, content) {
    socketRef.current?.emit('add_card', {
      boardId,
      columnId,
      content,
      authorName: name,
    });
  }

  function handleAddComment(cardId, content) {
    socketRef.current?.emit('add_comment', {
      boardId,
      cardId,
      content,
      authorName: name,
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
    // Optimistic local update
    setBoard((prev) =>
      moveCard(prev, {
        cardId: draggableId,
        fromColumnId: source.droppableId,
        toColumnId: destination.droppableId,
        toIndex: destination.index,
      })
    );
    socketRef.current?.emit('move_card', {
      boardId,
      cardId: draggableId,
      toColumnId: destination.droppableId,
      toIndex: destination.index,
    });
  }

  async function handleAddColumn(e) {
    e.preventDefault();
    const trimmed = newColTitle.trim();
    if (!trimmed) return;
    try {
      await createColumn(boardId, trimmed);
      setNewColTitle('');
    } catch (err) {
      setError(err.message);
    }
  }

  const exportHref = useMemo(() => exportBoardUrl(boardId), [boardId]);

  if (!name) return <GuestAuthModal onSubmit={handleJoin} />;
  if (loading) return <div className="empty">Loading board…</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!board) return <div className="empty">Board not found.</div>;

  return (
    <div className="board-page">
      <div className="board-header">
        <div>
          <h2>{board.title}</h2>
          <span className="muted">Signed in as <strong>{name}</strong></span>
        </div>
        <div className="board-actions">
          <form onSubmit={handleAddColumn} className="add-column-form">
            <input
              type="text"
              placeholder="New column title"
              value={newColTitle}
              onChange={(e) => setNewColTitle(e.target.value)}
            />
            <button type="submit" disabled={!newColTitle.trim()}>+ Column</button>
          </form>
          <a className="btn" href={exportHref}>Export CSV</a>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns">
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
  );
}

// ---- Pure state reducers ----
function addColumn(board, column) {
  if (!board) return board;
  if (board.columns.some((c) => c.id === column.id)) return board;
  return {
    ...board,
    columns: [...board.columns, { ...column, cards: [] }],
  };
}

function addCard(board, card) {
  if (!board) return board;
  return {
    ...board,
    columns: board.columns.map((col) => {
      if (col.id !== card.columnId) return col;
      if (col.cards.some((c) => c.id === card.id)) return col;
      return {
        ...col,
        cards: [...col.cards, { ...card, comments: card.comments || [] }].sort(
          (a, b) => a.position - b.position
        ),
      };
    }),
  };
}

function addComment(board, comment) {
  if (!board) return board;
  return {
    ...board,
    columns: board.columns.map((col) => ({
      ...col,
      cards: col.cards.map((card) => {
        if (card.id !== comment.cardId) return card;
        if ((card.comments || []).some((c) => c.id === comment.id)) return card;
        return {
          ...card,
          comments: [...(card.comments || []), comment],
        };
      }),
    })),
  };
}

function moveCard(board, evt) {
  if (!board) return board;
  const { cardId, toColumnId, toIndex } = evt;

  let movedCard = null;
  const stripped = board.columns.map((col) => {
    const idx = col.cards.findIndex((c) => c.id === cardId);
    if (idx === -1) return col;
    movedCard = col.cards[idx];
    return { ...col, cards: col.cards.filter((_, i) => i !== idx) };
  });
  if (!movedCard) return board;

  const updated = stripped.map((col) => {
    if (col.id !== toColumnId) return col;
    const cards = [...col.cards];
    const insertAt = Math.max(0, Math.min(toIndex ?? cards.length, cards.length));
    cards.splice(insertAt, 0, { ...movedCard, columnId: toColumnId });
    return { ...col, cards };
  });

  return { ...board, columns: updated };
}
