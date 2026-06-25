import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { api } from '../api.js';
import { getSocket } from '../socket.js';
import Column from '../components/Column.jsx';
import { CardOverlay } from '../components/Card.jsx';
import GuestAuthModal from '../components/GuestAuthModal.jsx';

const NAME_KEY = 'prism.displayName';

function initials(name) {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function BoardPage() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayName, setDisplayName] = useState(() => {
    try {
      return sessionStorage.getItem(NAME_KEY) || '';
    } catch {
      return '';
    }
  });
  const [presence, setPresence] = useState(0);
  const [activeDragCard, setActiveDragCard] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const socket = useMemo(() => getSocket(), []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  // Initial board load
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .getBoard(boardId)
      .then((data) => {
        if (!mounted) return;
        setBoard(data.board);
        document.title = `${data.board.title} — Prism Retro`;
      })
      .catch((err) => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [boardId]);

  // Socket lifecycle
  useEffect(() => {
    if (!displayName || !board) return;

    socket.emit('join_board', { boardId, displayName }, (ack) => {
      if (!ack?.ok) {
        showToast(ack?.error || 'Could not join board in realtime');
      }
    });

    function onCardAdded({ card }) {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === card.columnId
              ? { ...col, cards: [...col.cards, { ...card, comments: card.comments || [] }] }
              : col
          ),
        };
      });
    }

    function onCardMoved({ cardId, fromColumnId, toColumnId, toPosition }) {
      setBoard((prev) => {
        if (!prev) return prev;
        let moving = null;
        const stripped = prev.columns.map((col) => {
          if (col.id !== fromColumnId) return col;
          const next = [];
          for (const c of col.cards) {
            if (c.id === cardId) moving = { ...c, columnId: toColumnId };
            else next.push(c);
          }
          return { ...col, cards: next };
        });
        if (!moving) return prev;
        return {
          ...prev,
          columns: stripped.map((col) => {
            if (col.id !== toColumnId) return col;
            const existing = col.cards.filter((c) => c.id !== cardId);
            const insertAt = Math.max(0, Math.min(toPosition, existing.length));
            const next = [...existing];
            next.splice(insertAt, 0, moving);
            return { ...col, cards: next };
          }),
        };
      });
    }

    function onCommentAdded({ comment }) {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            cards: col.cards.map((c) =>
              c.id === comment.cardId
                ? { ...c, comments: [...(c.comments || []), comment] }
                : c
            ),
          })),
        };
      });
    }

    function onPresence({ connected }) {
      setPresence(connected || 0);
    }

    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);
    socket.on('presence_update', onPresence);
    socket.on('connect', () => {
      socket.emit('join_board', { boardId, displayName });
    });

    return () => {
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
      socket.off('presence_update', onPresence);
    };
  }, [socket, boardId, displayName, board?.id, showToast]);

  function handleSetName(name) {
    try {
      sessionStorage.setItem(NAME_KEY, name);
    } catch {}
    setDisplayName(name);
  }

  function handleAddCard(columnId, content) {
    socket.emit('add_card', { columnId, content }, (ack) => {
      if (!ack?.ok) showToast('Could not add card');
    });
  }

  function handleAddComment(cardId, content) {
    socket.emit('add_comment', { cardId, content }, (ack) => {
      if (!ack?.ok) showToast('Could not post comment');
    });
  }

  function findCardLocation(cardId) {
    if (!board) return null;
    for (const col of board.columns) {
      const idx = col.cards.findIndex((c) => c.id === cardId);
      if (idx !== -1) return { columnId: col.id, index: idx, card: col.cards[idx] };
    }
    return null;
  }

  function handleDragStart(event) {
    const loc = findCardLocation(event.active.id);
    if (loc) setActiveDragCard(loc.card);
  }

  function handleDragEnd(event) {
    setActiveDragCard(null);
    const { active, over } = event;
    if (!over) return;
    const fromLoc = findCardLocation(active.id);
    if (!fromLoc) return;

    let toColumnId = null;
    let toPosition = 0;

    if (over.data.current?.type === 'column') {
      toColumnId = over.data.current.columnId;
      const targetCol = board.columns.find((c) => c.id === toColumnId);
      toPosition = targetCol ? targetCol.cards.filter((c) => c.id !== active.id).length : 0;
    } else if (over.data.current?.type === 'card') {
      const overLoc = findCardLocation(over.id);
      if (!overLoc) return;
      toColumnId = overLoc.columnId;
      if (toColumnId === fromLoc.columnId) {
        const cards = board.columns.find((c) => c.id === toColumnId).cards;
        const oldIdx = cards.findIndex((c) => c.id === active.id);
        const newIdx = cards.findIndex((c) => c.id === over.id);
        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
        toPosition = newIdx;
      } else {
        toPosition = overLoc.index;
      }
    } else {
      return;
    }

    if (toColumnId === fromLoc.columnId && toPosition === fromLoc.index) return;

    // Optimistic local update
    setBoard((prev) => {
      if (!prev) return prev;
      let moving = null;
      const stripped = prev.columns.map((col) => {
        if (col.id !== fromLoc.columnId) return col;
        const next = [];
        for (const c of col.cards) {
          if (c.id === active.id) moving = { ...c, columnId: toColumnId };
          else next.push(c);
        }
        return { ...col, cards: next };
      });
      if (!moving) return prev;
      return {
        ...prev,
        columns: stripped.map((col) => {
          if (col.id !== toColumnId) return col;
          const existing = col.cards.filter((c) => c.id !== active.id);
          const insertAt = Math.max(0, Math.min(toPosition, existing.length));
          const next = [...existing];
          next.splice(insertAt, 0, moving);
          return { ...col, cards: next };
        }),
      };
    });

    socket.emit(
      'move_card',
      { cardId: active.id, toColumnId, toPosition },
      (ack) => {
        if (!ack?.ok) showToast('Could not move card');
      }
    );
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <span>Loading board…</span>
      </div>
    );
  }

  if (error) {
    return <div className="error-state">{error}</div>;
  }

  if (!board) return null;

  return (
    <div className="board-page">
      <div className="board-toolbar">
        <div className="board-title">
          <span className="board-title__eyebrow">Retro board</span>
          <h1 className="board-title__h1">{board.title}</h1>
        </div>
        <div className="board-actions">
          {presence > 0 && (
            <span className="presence" title="Currently connected">
              <span className="presence__dot" aria-hidden="true" />
              {presence} live
            </span>
          )}
          {displayName && (
            <span className="you-chip" title="Your display name">
              <span className="you-chip__avatar" aria-hidden="true">
                {initials(displayName)}
              </span>
              <span className="you-chip__name">{displayName}</span>
            </span>
          )}
          <a
            className="btn btn--ghost btn--sm"
            href={api.exportCsvUrl(board.id)}
            id="export-csv-btn"
            target="_blank"
            rel="noopener noreferrer"
          >
            <DownloadIcon /> Export CSV
          </a>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDragCard(null)}
      >
        <div className="columns" role="list">
          {board.columns.map((col, idx) => (
            <Column
              key={col.id}
              column={col}
              index={idx}
              onAddCard={handleAddCard}
              onAddComment={handleAddComment}
            />
          ))}
        </div>
        <DragOverlay>
          {activeDragCard ? <CardOverlay card={activeDragCard} /> : null}
        </DragOverlay>
      </DndContext>

      {!displayName && (
        <GuestAuthModal boardTitle={board.title} onSubmit={handleSetName} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
