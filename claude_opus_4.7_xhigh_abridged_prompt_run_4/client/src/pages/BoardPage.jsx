import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api } from '../api.js';
import { useDisplayName } from '../useDisplayName.js';
import NameModal from '../components/NameModal.jsx';
import Column from '../components/Column.jsx';
import CardModal from '../components/CardModal.jsx';
import { getSocket } from '../socket.js';

export default function BoardPage() {
  const { boardId } = useParams();
  const [displayName, setDisplayName] = useDisplayName();
  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [presence, setPresence] = useState(1);
  const [activeCardId, setActiveCardId] = useState(null);
  const socketRef = useRef(null);

  const loadBoard = useCallback(async () => {
    try {
      const data = await api.getBoard(boardId);
      setBoard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    setLoading(true);
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    if (!displayName || !boardId) return;
    const socket = getSocket();
    socketRef.current = socket;

    const joinRoom = () => socket.emit('join_board', { boardId });
    if (socket.connected) joinRoom();
    socket.on('connect', joinRoom);

    const onReconnect = () => {
      joinRoom();
      loadBoard();
    };
    socket.io.on('reconnect', onReconnect);

    socket.on('presence', ({ count }) => setPresence(count));

    socket.on('card_added', (card) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === card.column_id
              ? { ...col, cards: [...col.cards, { ...card, comments: card.comments || [] }] }
              : col
          )
        };
      });
    });

    socket.on('card_moved', ({ cardId, toColumnId }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        let moved = null;
        const withoutCard = prev.columns.map((col) => {
          const idx = col.cards.findIndex((c) => c.id === cardId);
          if (idx === -1) return col;
          moved = col.cards[idx];
          return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
        });
        if (!moved) return prev;
        const nextCard = { ...moved, column_id: toColumnId };
        return {
          ...prev,
          columns: withoutCard.map((col) =>
            col.id === toColumnId ? { ...col, cards: [...col.cards, nextCard] } : col
          )
        };
      });
      // Server holds truth for exact position; refetch keeps us aligned when many clients edit.
      loadBoard();
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
                ? { ...card, comments: [...(card.comments || []), comment] }
                : card
            )
          }))
        };
      });
    });

    socket.on('column_added', (column) => {
      setBoard((prev) => {
        if (!prev) return prev;
        if (prev.columns.some((c) => c.id === column.id)) return prev;
        return {
          ...prev,
          columns: [...prev.columns, { ...column, cards: [] }]
        };
      });
    });

    return () => {
      socket.off('connect', joinRoom);
      socket.io.off('reconnect', onReconnect);
      socket.off('presence');
      socket.off('card_added');
      socket.off('card_moved');
      socket.off('comment_added');
      socket.off('column_added');
    };
  }, [boardId, displayName, loadBoard]);

  const activeCard = useMemo(() => {
    if (!board || !activeCardId) return null;
    for (const column of board.columns) {
      const found = column.cards.find((c) => c.id === activeCardId);
      if (found) return { ...found, columnTitle: column.title };
    }
    return null;
  }, [board, activeCardId]);

  function handleAddCard(columnId, content) {
    if (!content.trim() || !socketRef.current) return;
    socketRef.current.emit('add_card', {
      columnId,
      content: content.trim(),
      authorName: displayName
    });
  }

  function handleAddComment(cardId, content) {
    if (!content.trim() || !socketRef.current) return;
    socketRef.current.emit('add_comment', {
      cardId,
      content: content.trim(),
      authorName: displayName
    });
  }

  function handleAddColumn() {
    const title = window.prompt('New column title');
    if (!title || !title.trim() || !socketRef.current) return;
    socketRef.current.emit('add_column', {
      boardId,
      title: title.trim()
    });
  }

  function handleDragEnd(result) {
    if (!result.destination || !socketRef.current || !board) return;
    const { source, destination, draggableId } = result;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Optimistic local reorder
    setBoard((prev) => {
      if (!prev) return prev;
      const sourceCol = prev.columns.find((c) => c.id === source.droppableId);
      const destCol = prev.columns.find((c) => c.id === destination.droppableId);
      if (!sourceCol || !destCol) return prev;
      const sourceCards = [...sourceCol.cards];
      const [moving] = sourceCards.splice(source.index, 1);
      if (!moving) return prev;
      const destCards =
        sourceCol.id === destCol.id ? sourceCards : [...destCol.cards];
      destCards.splice(destination.index, 0, {
        ...moving,
        column_id: destCol.id
      });
      return {
        ...prev,
        columns: prev.columns.map((col) => {
          if (col.id === sourceCol.id && sourceCol.id !== destCol.id) {
            return { ...col, cards: sourceCards };
          }
          if (col.id === destCol.id) {
            return { ...col, cards: destCards };
          }
          return col;
        })
      };
    });

    socketRef.current.emit('move_card', {
      cardId: draggableId,
      toColumnId: destination.droppableId,
      toIndex: destination.index
    });
  }

  if (!displayName) {
    return (
      <NameModal
        onSubmit={(name) => {
          setDisplayName(name);
        }}
      />
    );
  }

  if (loading) {
    return (
      <main className="page board-page">
        <div className="board-loading">Loading board…</div>
      </main>
    );
  }

  if (error || !board) {
    return (
      <main className="page board-page">
        <div className="board-error">
          <h2>Board not available</h2>
          <p>{error || 'Unknown error'}</p>
          <Link className="btn btn-secondary" to="/">
            ← Back to boards
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page board-page">
      <header className="board-header">
        <div className="board-header-left">
          <Link className="back-link" to="/">
            ← Boards
          </Link>
          <h1 className="board-title">{board.title}</h1>
        </div>
        <div className="board-header-right">
          <div className="presence-chip" title="People viewing this board">
            <span className="presence-dot" />
            {presence} online
          </div>
          <div className="who-chip" title="Your display name">
            <span className="who-avatar">{initials(displayName)}</span>
            <span className="who-name">{displayName}</span>
            <button
              className="link-button"
              onClick={() => setDisplayName('')}
              type="button"
            >
              change
            </button>
          </div>
          <a
            href={api.exportUrl(boardId)}
            className="btn btn-secondary"
            download
          >
            Export CSV
          </a>
        </div>
      </header>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board-columns">
          {board.columns.map((column) => (
            <Droppable droppableId={column.id} key={column.id}>
              {(provided, snapshot) => (
                <Column
                  ref={provided.innerRef}
                  droppableProps={provided.droppableProps}
                  placeholder={provided.placeholder}
                  isDraggingOver={snapshot.isDraggingOver}
                  column={column}
                  onAddCard={(content) => handleAddCard(column.id, content)}
                  onOpenCard={(cardId) => setActiveCardId(cardId)}
                  renderCard={(card, index) => (
                    <Draggable draggableId={card.id} index={index} key={card.id}>
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className={`card ${dragSnapshot.isDragging ? 'card-dragging' : ''}`}
                          onClick={() => setActiveCardId(card.id)}
                        >
                          <div className="card-content">{card.content}</div>
                          <div className="card-footer">
                            <span className="card-author">
                              <span className="avatar">{initials(card.author_name)}</span>
                              {card.author_name}
                            </span>
                            <span className="card-comments" title="Comments">
                              💬 {card.comments?.length ?? 0}
                            </span>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  )}
                />
              )}
            </Droppable>
          ))}
          <button
            type="button"
            className="add-column-btn"
            onClick={handleAddColumn}
          >
            + Add column
          </button>
        </div>
      </DragDropContext>

      {activeCard && (
        <CardModal
          card={activeCard}
          onClose={() => setActiveCardId(null)}
          onAddComment={(content) => handleAddComment(activeCard.id, content)}
        />
      )}
    </main>
  );
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || '');
  return letters.join('') || '?';
}
