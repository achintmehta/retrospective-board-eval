import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api } from '../api.js';
import { getSocket, emitWithAck } from '../socket.js';
import { getDisplayName, setDisplayName } from '../identity.js';
import GuestAuthModal from '../components/GuestAuthModal.jsx';
import AddCardForm from '../components/AddCardForm.jsx';
import CardDetailsModal from '../components/CardDetailsModal.jsx';
import AddColumnForm from '../components/AddColumnForm.jsx';

export default function BoardPage() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState(getDisplayName());
  const [activeCardId, setActiveCardId] = useState(null);
  const socketRef = useRef(null);

  const joinBoard = useCallback(
    async (currentName) => {
      const socket = getSocket();
      socketRef.current = socket;
      try {
        const ack = await emitWithAck(socket, 'join_board', { boardId, name: currentName });
        setBoard(ack.board);
        setError('');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [boardId]
  );

  // Initial load: REST fetch + (when name available) join the realtime room.
  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const data = await api.getBoard(boardId);
        if (!cancelled) {
          setBoard(data);
          setError('');
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  // Join realtime room once we know the user's name.
  useEffect(() => {
    if (!name) return;
    joinBoard(name);
    const socket = socketRef.current;
    if (!socket) return;

    function onCardAdded(card) {
      setBoard((b) => (b ? { ...b, cards: appendUnique(b.cards, card) } : b));
    }
    function onCardMoved({ card }) {
      setBoard((b) => {
        if (!b) return b;
        return { ...b, cards: replaceCard(b.cards, card) };
      });
    }
    function onCommentAdded(comment) {
      setBoard((b) => (b ? { ...b, comments: appendUnique(b.comments, comment) } : b));
    }
    function onColumnAdded(column) {
      setBoard((b) => (b ? { ...b, columns: appendUnique(b.columns, column) } : b));
    }
    function onReconnect() {
      // After a reconnect, rejoin and refetch state to avoid drift.
      joinBoard(name);
    }

    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);
    socket.on('column_added', onColumnAdded);
    socket.io.on('reconnect', onReconnect);

    return () => {
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
      socket.off('column_added', onColumnAdded);
      socket.io.off('reconnect', onReconnect);
    };
  }, [name, joinBoard]);

  const cardsByColumn = useMemo(() => groupCardsByColumn(board), [board]);
  const commentsByCard = useMemo(() => groupCommentsByCard(board), [board]);

  function handleNameSubmit(value) {
    const saved = setDisplayName(value);
    if (saved) setName(saved);
  }

  async function handleAddCard(columnId, content) {
    const socket = socketRef.current;
    if (!socket) return;
    try {
      await emitWithAck(socket, 'add_card', { columnId, content, authorName: name });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddComment(cardId, content) {
    const socket = socketRef.current;
    if (!socket) return;
    try {
      await emitWithAck(socket, 'add_comment', { cardId, content, authorName: name });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddColumn(title) {
    try {
      await api.addColumn(boardId, title);
      // The server emits column_added; nothing more to do.
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDragEnd(result) {
    if (!result.destination) return;
    const { draggableId, destination, source } = result;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
    // Optimistic update.
    const prevCards = board.cards;
    setBoard((b) => {
      if (!b) return b;
      const card = b.cards.find((c) => c.id === draggableId);
      if (!card) return b;
      const updatedCard = { ...card, column_id: destination.droppableId };
      const cards = b.cards.map((c) => (c.id === draggableId ? updatedCard : c));
      return { ...b, cards };
    });
    try {
      const socket = socketRef.current;
      await emitWithAck(socket, 'move_card', {
        cardId: draggableId,
        toColumnId: destination.droppableId,
        newIndex: destination.index,
      });
    } catch (err) {
      // Roll back.
      setBoard((b) => (b ? { ...b, cards: prevCards } : b));
      setError(err.message);
    }
  }

  if (loading) {
    return <p className="centered muted">Loading board…</p>;
  }
  if (error && !board) {
    return (
      <div className="centered">
        <h2>Could not load board</h2>
        <p className="error">{error}</p>
      </div>
    );
  }
  if (!board) return null;

  if (!name) {
    return (
      <>
        <BoardHeader board={board} name="" />
        <GuestAuthModal onSubmit={handleNameSubmit} />
      </>
    );
  }

  const activeCard = activeCardId ? board.cards.find((c) => c.id === activeCardId) : null;
  const activeColumn = activeCard
    ? board.columns.find((c) => c.id === activeCard.column_id)
    : null;
  const activeCardComments = activeCard ? commentsByCard.get(activeCard.id) || [] : [];

  return (
    <div className="page board-page">
      <BoardHeader board={board} name={name} />
      {error && <p className="error inline-error">{error}</p>}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns">
          {board.columns
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((column) => (
              <Column
                key={column.id}
                column={column}
                cards={cardsByColumn.get(column.id) || []}
                commentsByCard={commentsByCard}
                onAddCard={(content) => handleAddCard(column.id, content)}
                onOpenCard={(cardId) => setActiveCardId(cardId)}
              />
            ))}
          <AddColumnForm onSubmit={handleAddColumn} />
        </div>
      </DragDropContext>
      {activeCard && (
        <CardDetailsModal
          card={activeCard}
          column={activeColumn}
          comments={activeCardComments}
          onClose={() => setActiveCardId(null)}
          onAddComment={(content) => handleAddComment(activeCard.id, content)}
        />
      )}
    </div>
  );
}

function BoardHeader({ board, name }) {
  return (
    <header className="board-header">
      <div>
        <h1>{board.title}</h1>
        <p className="board-subtitle">
          {board.columns.length} columns · {board.cards.length} cards · {board.comments.length} comments
          {name ? ` · joined as ${name}` : ''}
        </p>
      </div>
      <div className="board-actions">
        <a
          className="btn"
          href={api.exportUrl(board.id)}
          target="_blank"
          rel="noreferrer"
        >
          Export to CSV
        </a>
      </div>
    </header>
  );
}

function Column({ column, cards, onAddCard, onOpenCard, commentsByCard }) {
  return (
    <section className="column">
      <header className="column-header">
        <h3>{column.title}</h3>
        <span className="column-count">{cards.length}</span>
      </header>
      <Droppable droppableId={column.id} type="CARD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`card-drop ${snapshot.isDraggingOver ? 'is-dragging-over' : ''}`}
          >
            {cards.map((card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <article
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className={`card ${dragSnapshot.isDragging ? 'is-dragging' : ''}`}
                    onClick={() => onOpenCard(card.id)}
                  >
                    <p className="card-content">{card.content}</p>
                    <footer className="card-footer">
                      <span className="author">{card.author_name}</span>
                      <span className="comment-count">
                        💬 {(commentsByCard.get(card.id) || []).length}
                      </span>
                    </footer>
                  </article>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <AddCardForm onSubmit={onAddCard} />
    </section>
  );
}

function appendUnique(list, item) {
  if (list.some((x) => x.id === item.id)) {
    return list.map((x) => (x.id === item.id ? item : x));
  }
  return [...list, item];
}

function replaceCard(list, card) {
  if (!list.some((x) => x.id === card.id)) return [...list, card];
  return list.map((x) => (x.id === card.id ? card : x));
}

function groupCardsByColumn(board) {
  const map = new Map();
  if (!board) return map;
  for (const card of board.cards) {
    if (!map.has(card.column_id)) map.set(card.column_id, []);
    map.get(card.column_id).push(card);
  }
  for (const [key, list] of map) {
    list.sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return String(a.created_at).localeCompare(String(b.created_at));
    });
    map.set(key, list);
  }
  return map;
}

function groupCommentsByCard(board) {
  const map = new Map();
  if (!board) return map;
  for (const comment of board.comments) {
    if (!map.has(comment.card_id)) map.set(comment.card_id, []);
    map.get(comment.card_id).push(comment);
  }
  for (const [key, list] of map) {
    list.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    map.set(key, list);
  }
  return map;
}
