import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api } from '../api.js';
import { getDisplayName, setDisplayName } from '../session.js';
import GuestNameModal from '../components/GuestNameModal.jsx';
import CommentsPanel from '../components/CommentsPanel.jsx';

export default function BoardPage() {
  const { boardId } = useParams();
  const [displayName, setDisplayNameState] = useState(() => getDisplayName());
  const [board, setBoard] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const socketRef = useRef(null);

  // Load board state from REST when the boardId changes.
  const refetchBoard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getBoard(boardId);
      setBoard(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    refetchBoard();
  }, [refetchBoard]);

  // Establish the socket connection once we have a display name.
  useEffect(() => {
    if (!displayName) return undefined;
    const socket = io({ autoConnect: true });
    socketRef.current = socket;

    function join() {
      socket.emit('join_board', { boardId, displayName }, (resp) => {
        if (resp && resp.ok) {
          setJoined(true);
        } else {
          setError(resp?.error || 'Failed to join board');
        }
      });
    }

    socket.on('connect', join);
    socket.on('disconnect', () => setJoined(false));
    // On reconnect, refetch state to recover from any missed events.
    socket.io.on('reconnect', () => {
      refetchBoard();
      join();
    });

    socket.on('card_added', (card) => {
      setBoard((prev) => prev && applyCardAdded(prev, card));
    });
    socket.on('card_moved', (move) => {
      setBoard((prev) => prev && applyCardMoved(prev, move));
    });
    socket.on('comment_added', (comment) => {
      setBoard((prev) => prev && applyCommentAdded(prev, comment));
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [displayName, boardId, refetchBoard]);

  function handleNameSubmit(name) {
    setDisplayName(name);
    setDisplayNameState(name);
  }

  function emit(event, payload) {
    const socket = socketRef.current;
    if (!socket || !joined) {
      setError('Not connected to board yet — try again in a moment.');
      return;
    }
    socket.emit(event, payload, (resp) => {
      if (resp && resp.ok === false) {
        setError(resp.error || 'Action failed');
      }
    });
  }

  function onAddCard(columnId, content) {
    emit('add_card', { columnId, content });
  }

  function onAddComment(cardId, content) {
    emit('add_comment', { cardId, content });
  }

  function onDragEnd(result) {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }
    // Optimistic update; server will broadcast the authoritative state.
    setBoard((prev) =>
      prev &&
      applyCardMoved(prev, {
        cardId: draggableId,
        fromColumnId: source.droppableId,
        toColumnId: destination.droppableId,
        fromPosition: source.index,
        toPosition: destination.index,
      })
    );
    emit('move_card', {
      cardId: draggableId,
      toColumnId: destination.droppableId,
      toPosition: destination.index,
    });
  }

  async function onAddColumn(e) {
    e.preventDefault();
    const title = newColumnTitle.trim();
    if (!title) return;
    try {
      await api.createColumn(boardId, title);
      setNewColumnTitle('');
      await refetchBoard();
    } catch (err) {
      setError(err.message);
    }
  }

  const selectedCard = useMemo(() => {
    if (!board || !selectedCardId) return null;
    for (const col of board.columns) {
      const found = col.cards.find((c) => c.id === selectedCardId);
      if (found) return found;
    }
    return null;
  }, [board, selectedCardId]);

  if (!displayName) {
    return <GuestNameModal onSubmit={handleNameSubmit} />;
  }

  if (loading) return <p className="p-4">Loading board…</p>;
  if (error && !board) return <p className="error p-4">{error}</p>;
  if (!board) return null;

  return (
    <div className="board-page">
      <header className="board-header">
        <div>
          <h1>{board.title}</h1>
          <p className="muted">
            Joined as <strong>{displayName}</strong>{' '}
            {joined ? <span className="dot connected" title="connected" /> : <span className="dot" title="connecting" />}
          </p>
        </div>
        <div className="board-actions">
          <a
            href={api.exportUrl(board.id)}
            className="btn-secondary"
            download
          >
            Export CSV
          </a>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="columns">
          {board.columns.map((col) => (
            <BoardColumn
              key={col.id}
              column={col}
              onAddCard={onAddCard}
              onOpenCard={setSelectedCardId}
            />
          ))}
          <form className="column add-column" onSubmit={onAddColumn}>
            <input
              type="text"
              placeholder="New column title"
              value={newColumnTitle}
              maxLength={80}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              aria-label="New column title"
            />
            <button type="submit" disabled={!newColumnTitle.trim()}>
              + Add Column
            </button>
          </form>
        </div>
      </DragDropContext>

      {selectedCard && (
        <CommentsPanel
          card={selectedCard}
          onClose={() => setSelectedCardId(null)}
          onAddComment={onAddComment}
        />
      )}
    </div>
  );
}

function BoardColumn({ column, onAddCard, onOpenCard }) {
  const [text, setText] = useState('');

  function submit(e) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    onAddCard(column.id, value);
    setText('');
  }

  return (
    <div className="column">
      <h3 className="column-title">
        {column.title} <span className="muted small">({column.cards.length})</span>
      </h3>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`drop-area${snapshot.isDraggingOver ? ' over' : ''}`}
          >
            {column.cards.map((card, idx) => (
              <Draggable draggableId={card.id} index={idx} key={card.id}>
                {(p, snap) => (
                  <div
                    ref={p.innerRef}
                    {...p.draggableProps}
                    {...p.dragHandleProps}
                    className={`card-tile${snap.isDragging ? ' dragging' : ''}`}
                    onClick={() => onOpenCard(card.id)}
                  >
                    <p className="card-content">{card.content}</p>
                    <p className="muted small">
                      {card.authorName}
                      {card.comments.length > 0 && (
                        <> · 💬 {card.comments.length}</>
                      )}
                    </p>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <form className="add-card" onSubmit={submit}>
        <textarea
          placeholder="Add a card…"
          value={text}
          maxLength={4000}
          rows={2}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" disabled={!text.trim()}>+ Add</button>
      </form>
    </div>
  );
}

// --- pure reducers for socket events ---

function applyCardAdded(board, card) {
  return {
    ...board,
    columns: board.columns.map((col) =>
      col.id === card.columnId
        ? { ...col, cards: upsertCardSorted(col.cards, { ...card, comments: card.comments || [] }) }
        : col
    ),
  };
}

function applyCommentAdded(board, comment) {
  return {
    ...board,
    columns: board.columns.map((col) => ({
      ...col,
      cards: col.cards.map((card) =>
        card.id === comment.cardId
          ? {
              ...card,
              comments: card.comments.some((c) => c.id === comment.id)
                ? card.comments
                : [...card.comments, comment],
            }
          : card
      ),
    })),
  };
}

function applyCardMoved(board, move) {
  // Remove the card from the source column, then insert it into the destination at toPosition.
  let movedCard = null;
  const columnsAfterRemoval = board.columns.map((col) => {
    if (col.id !== move.fromColumnId) return col;
    const remaining = [];
    for (const c of col.cards) {
      if (c.id === move.cardId) {
        movedCard = { ...c, columnId: move.toColumnId };
      } else {
        remaining.push(c);
      }
    }
    return { ...col, cards: remaining };
  });
  if (!movedCard) return board;
  return {
    ...board,
    columns: columnsAfterRemoval.map((col) => {
      if (col.id !== move.toColumnId) return col;
      const next = col.cards.slice();
      const idx = Math.min(Math.max(move.toPosition, 0), next.length);
      next.splice(idx, 0, movedCard);
      return { ...col, cards: next };
    }),
  };
}

function upsertCardSorted(cards, card) {
  if (cards.some((c) => c.id === card.id)) return cards;
  const next = [...cards, card];
  next.sort((a, b) => a.position - b.position || a.createdAt - b.createdAt);
  return next;
}
