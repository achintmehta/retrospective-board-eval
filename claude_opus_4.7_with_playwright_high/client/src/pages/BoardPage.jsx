import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  DragDropContext,
  Droppable,
  Draggable,
} from '@hello-pangea/dnd';
import { api } from '../api.js';
import GuestAuthModal from '../components/GuestAuthModal.jsx';
import Card from '../components/Card.jsx';

const NAME_KEY = 'retroboard.displayName';

export default function BoardPage() {
  const { id: boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState(
    () => sessionStorage.getItem(NAME_KEY) || '',
  );
  const [openCommentsFor, setOpenCommentsFor] = useState(null);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const socketRef = useRef(null);

  // Fetch initial state
  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .getBoard(boardId)
      .then((data) => {
        if (alive) setBoard(data);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [boardId]);

  // Socket lifecycle: connect only after we have a display name.
  useEffect(() => {
    if (!displayName) return;
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.emit('join_board', { boardId });

    socket.on('card_added', (card) => {
      setBoard((prev) =>
        prev
          ? {
              ...prev,
              columns: prev.columns.map((c) =>
                c.id === card.column_id
                  ? { ...c, cards: [...c.cards, card] }
                  : c,
              ),
            }
          : prev,
      );
    });

    socket.on('card_moved', ({ cardId, toColumnId, toPosition }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        let movedCard = null;
        const cleared = prev.columns.map((col) => {
          const idx = col.cards.findIndex((c) => c.id === cardId);
          if (idx >= 0) {
            movedCard = col.cards[idx];
            return {
              ...col,
              cards: col.cards.filter((c) => c.id !== cardId),
            };
          }
          return col;
        });
        if (!movedCard) return prev;
        const updated = { ...movedCard, column_id: toColumnId };
        return {
          ...prev,
          columns: cleared.map((col) => {
            if (col.id !== toColumnId) return col;
            const next = [...col.cards];
            next.splice(Math.min(toPosition, next.length), 0, updated);
            return { ...col, cards: next };
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
            cards: col.cards.map((card) =>
              card.id === comment.card_id
                ? { ...card, comments: [...card.comments, comment] }
                : card,
            ),
          })),
        };
      });
    });

    socket.on('disconnect', () => {
      // refetch on reconnect to avoid drift
      socket.once('connect', () => {
        socket.emit('join_board', { boardId });
        api.getBoard(boardId).then(setBoard).catch(() => {});
      });
    });

    return () => {
      socket.emit('leave_board', { boardId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [boardId, displayName]);

  function handleSetName(name) {
    sessionStorage.setItem(NAME_KEY, name);
    setDisplayName(name);
  }

  function handleAddCard(columnId, content) {
    const trimmed = content.trim();
    if (!trimmed || !socketRef.current) return;
    socketRef.current.emit('add_card', {
      columnId,
      content: trimmed,
      authorName: displayName,
    });
  }

  function handleAddComment(cardId, content) {
    const trimmed = content.trim();
    if (!trimmed || !socketRef.current) return;
    socketRef.current.emit('add_comment', {
      cardId,
      content: trimmed,
      authorName: displayName,
    });
  }

  async function handleAddColumn(e) {
    e.preventDefault();
    const trimmed = newColumnTitle.trim();
    if (!trimmed) return;
    try {
      await api.createColumn(boardId, trimmed);
      setNewColumnTitle('');
      const fresh = await api.getBoard(boardId);
      setBoard(fresh);
    } catch (e) {
      setError(e.message);
    }
  }

  function handleDragEnd(result) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;
    if (!socketRef.current) return;
    socketRef.current.emit('move_card', {
      cardId: draggableId,
      toColumnId: destination.droppableId,
      toPosition: destination.index,
    });
  }

  const exportHref = useMemo(() => api.exportUrl(boardId), [boardId]);

  if (!displayName) {
    return <GuestAuthModal onSubmit={handleSetName} />;
  }
  if (loading) return <div className="page"><p>Loading board…</p></div>;
  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!board) return <div className="page"><p>Board not found.</p></div>;

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <Link to="/" className="muted">
            ← All boards
          </Link>
          <h1>{board.title}</h1>
        </div>
        <div className="topbar-right">
          <span className="muted">Signed in as <strong>{displayName}</strong></span>
          <a className="btn-link" href={exportHref}>
            Export CSV
          </a>
        </div>
      </header>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns">
          {board.columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              onAddCard={handleAddCard}
              onAddComment={handleAddComment}
              openCommentsFor={openCommentsFor}
              setOpenCommentsFor={setOpenCommentsFor}
            />
          ))}
          <form className="add-column" onSubmit={handleAddColumn}>
            <input
              type="text"
              placeholder="+ New column"
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              maxLength={60}
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

function Column({ column, onAddCard, onAddComment, openCommentsFor, setOpenCommentsFor }) {
  const [draft, setDraft] = useState('');

  function submit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onAddCard(column.id, text);
    setDraft('');
  }

  return (
    <div className="column">
      <header className="column-header">
        <h3>{column.title}</h3>
        <span className="muted">{column.cards.length}</span>
      </header>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`droppable ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
          >
            {column.cards.map((card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className={`card-wrap ${dragSnapshot.isDragging ? 'dragging' : ''}`}
                  >
                    <Card
                      card={card}
                      open={openCommentsFor === card.id}
                      onToggleComments={() =>
                        setOpenCommentsFor(
                          openCommentsFor === card.id ? null : card.id,
                        )
                      }
                      onAddComment={(content) => onAddComment(card.id, content)}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <form className="card-composer" onSubmit={submit}>
        <textarea
          rows={2}
          placeholder="Add a card…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
        />
        <button type="submit" disabled={!draft.trim()}>
          Add card
        </button>
      </form>
    </div>
  );
}
