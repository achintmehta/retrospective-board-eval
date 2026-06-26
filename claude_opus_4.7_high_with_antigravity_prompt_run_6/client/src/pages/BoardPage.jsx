import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';
import { getSocket } from '../socket.js';
import GuestModal from '../components/GuestModal.jsx';
import Column from '../components/Column.jsx';
import AddColumnForm from '../components/AddColumnForm.jsx';
import CommentsModal from '../components/CommentsModal.jsx';

const NAME_KEY = 'retroboard.displayName';

export default function BoardPage() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [error, setError] = useState(null);
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem(NAME_KEY) || ''
  );
  const [activeCardId, setActiveCardId] = useState(null);
  const [draggingCardId, setDraggingCardId] = useState(null);
  const [presence, setPresence] = useState([]);
  const draggingRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getBoard(boardId);
      setBoard(data);
    } catch (e) {
      setError(e.message);
    }
  }, [boardId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // socket lifecycle
  useEffect(() => {
    if (!displayName) return;
    const socket = getSocket();

    function onConnect() {
      socket.emit(
        'join_board',
        { boardId, displayName },
        () => refresh() // refetch on (re)join to stay consistent
      );
    }

    if (socket.connected) onConnect();
    socket.on('connect', onConnect);

    function onCardAdded({ card }) {
      setBoard((b) => {
        if (!b) return b;
        return {
          ...b,
          columns: b.columns.map((col) =>
            col.id === card.column_id
              ? { ...col, cards: insertCard(col.cards, card) }
              : col
          ),
        };
      });
    }

    function onCardMoved({ card, fromColumnId }) {
      setBoard((b) => {
        if (!b) return b;
        return {
          ...b,
          columns: b.columns.map((col) => {
            if (col.id === fromColumnId && fromColumnId !== card.column_id) {
              return { ...col, cards: col.cards.filter((c) => c.id !== card.id) };
            }
            if (col.id === card.column_id) {
              const without = col.cards.filter((c) => c.id !== card.id);
              const prev =
                col.cards.find((c) => c.id === card.id) || { comments: [] };
              const merged = { ...prev, ...card };
              return { ...col, cards: insertCard(without, merged) };
            }
            return col;
          }),
        };
      });
    }

    function onCommentAdded({ cardId, comment }) {
      setBoard((b) => {
        if (!b) return b;
        return {
          ...b,
          columns: b.columns.map((col) => ({
            ...col,
            cards: col.cards.map((c) =>
              c.id === cardId
                ? { ...c, comments: [...(c.comments || []), comment] }
                : c
            ),
          })),
        };
      });
    }

    function onPresenceJoin({ displayName: name }) {
      setPresence((p) => [...p, { name, at: Date.now() }].slice(-5));
    }
    function onPresenceLeave({ displayName: name }) {
      setPresence((p) => [...p, { name, leaving: true, at: Date.now() }].slice(-5));
    }

    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);
    socket.on('presence_join', onPresenceJoin);
    socket.on('presence_leave', onPresenceLeave);

    return () => {
      socket.off('connect', onConnect);
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
      socket.off('presence_join', onPresenceJoin);
      socket.off('presence_leave', onPresenceLeave);
    };
  }, [boardId, displayName, refresh]);

  function handleGuestSubmit(name) {
    localStorage.setItem(NAME_KEY, name);
    setDisplayName(name);
  }

  function addCard(columnId, content) {
    getSocket().emit('add_card', { boardId, columnId, content });
  }

  function addComment(cardId, content) {
    getSocket().emit('add_comment', { boardId, cardId, content });
  }

  async function addColumn(title) {
    try {
      await api.createColumn(boardId, title);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  function onCardDragStart(e, card) {
    draggingRef.current = card;
    setDraggingCardId(card.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
  }
  function onCardDragEnd() {
    draggingRef.current = null;
    setDraggingCardId(null);
  }
  function onCardDrop(toColumnId, toPosition) {
    const dragging = draggingRef.current;
    if (!dragging) return;
    // Adjust for the case where the card was already in the column above the target
    let adjusted = toPosition;
    if (dragging.column_id === toColumnId && dragging.position < toPosition) {
      adjusted = toPosition - 1;
    }
    getSocket().emit('move_card', {
      boardId,
      cardId: dragging.id,
      toColumnId,
      toPosition: adjusted,
    });
  }

  function openComments(card) {
    setActiveCardId(card.id);
  }

  if (error)
    return (
      <div className="board-error">
        <p className="error">{error}</p>
        <Link to="/">← Back to boards</Link>
      </div>
    );

  if (!board) return <p className="muted">Loading board…</p>;

  if (!displayName) return <GuestModal onSubmit={handleGuestSubmit} />;

  const activeCard =
    activeCardId &&
    board.columns
      .flatMap((c) => c.cards)
      .find((c) => c.id === activeCardId);

  return (
    <section className="board-page">
      <div className="board-bar">
        <div>
          <Link to="/" className="back-link">← All boards</Link>
          <h1>{board.title}</h1>
          <p className="muted">Joined as <strong>{displayName}</strong></p>
        </div>
        <div className="board-actions">
          {presence.length > 0 && (
            <div className="presence-list" aria-live="polite">
              {presence.slice(-3).map((p, i) => (
                <span key={i} className="presence-chip">
                  {p.leaving ? '👋' : '✨'} {p.name}
                </span>
              ))}
            </div>
          )}
          <a
            id="export-csv-button"
            className="export-btn"
            href={api.exportUrl(board.id)}
            download
          >
            ↓ Export CSV
          </a>
        </div>
      </div>

      <div className="board-columns">
        {board.columns.map((col) => (
          <Column
            key={col.id}
            column={col}
            onAddCard={addCard}
            onOpenComments={openComments}
            onCardDragStart={onCardDragStart}
            onCardDragEnd={onCardDragEnd}
            onCardDrop={onCardDrop}
            draggingCardId={draggingCardId}
          />
        ))}
        <div className="column add-column">
          <AddColumnForm onAdd={addColumn} />
        </div>
      </div>

      {activeCard && (
        <CommentsModal
          card={activeCard}
          onClose={() => setActiveCardId(null)}
          onAddComment={(content) => addComment(activeCard.id, content)}
        />
      )}
    </section>
  );
}

function insertCard(cards, card) {
  const without = cards.filter((c) => c.id !== card.id);
  const next = [...without];
  const pos = Math.min(card.position, next.length);
  next.splice(pos, 0, card);
  return next.map((c, i) => ({ ...c, position: i }));
}
