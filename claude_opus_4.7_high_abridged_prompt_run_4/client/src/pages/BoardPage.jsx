import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core';
import { api } from '../api.js';
import { createBoardSocket } from '../socket.js';
import { useDisplayName } from '../hooks/useDisplayName.js';
import NameModal from '../components/NameModal.jsx';
import Column from '../components/Column.jsx';
import CommentsPanel from '../components/CommentsPanel.jsx';

function findCard(board, cardId) {
  for (const col of board.columns) {
    const c = col.cards.find((c) => c.id === cardId);
    if (c) return { card: c, column: col };
  }
  return null;
}

export default function BoardPage() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState(1);
  const [openCardId, setOpenCardId] = useState(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [copyTooltip, setCopyTooltip] = useState('');
  const [activeDragId, setActiveDragId] = useState(null);
  const socketRef = useRef(null);
  const { name, setName } = useDisplayName();

  useEffect(() => {
    let cancelled = false;
    api
      .getBoard(boardId)
      .then((data) => {
        if (!cancelled) setBoard(data.board);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  useEffect(() => {
    if (!board || !name) return;
    const socket = createBoardSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit(
        'join_board',
        { boardId, displayName: name },
        (ack) => {
          if (!ack?.ok) setError(ack?.error || 'Failed to join board');
        },
      );
      // On (re)connect refetch state to guard against drift.
      api
        .getBoard(boardId)
        .then((data) => setBoard(data.board))
        .catch(() => {});
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('presence', ({ count }) => setPresence(count));

    socket.on('card_added', (card) => {
      setBoard((b) => {
        if (!b) return b;
        return {
          ...b,
          columns: b.columns.map((col) =>
            col.id === card.column_id
              ? { ...col, cards: [...col.cards, { ...card, comments: [] }] }
              : col,
          ),
        };
      });
    });

    socket.on('card_moved', ({ card_id, from_column_id, to_column_id, new_index }) => {
      setBoard((b) => {
        if (!b) return b;
        let moving = null;
        const columns = b.columns.map((col) => {
          if (col.id === from_column_id) {
            const cards = col.cards.filter((c) => {
              if (c.id === card_id) {
                moving = c;
                return false;
              }
              return true;
            });
            return { ...col, cards };
          }
          return col;
        });
        if (!moving) return b;
        return {
          ...b,
          columns: columns.map((col) => {
            if (col.id === to_column_id) {
              const cards = [...col.cards];
              const idx = Math.max(0, Math.min(new_index, cards.length));
              cards.splice(idx, 0, { ...moving, column_id: to_column_id });
              return { ...col, cards };
            }
            return col;
          }),
        };
      });
    });

    socket.on('comment_added', (comment) => {
      setBoard((b) => {
        if (!b) return b;
        return {
          ...b,
          columns: b.columns.map((col) => ({
            ...col,
            cards: col.cards.map((c) =>
              c.id === comment.card_id
                ? { ...c, comments: [...c.comments, comment] }
                : c,
            ),
          })),
        };
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [board?.id, name, boardId]);

  const openCard = useMemo(() => {
    if (!board || !openCardId) return null;
    const found = findCard(board, openCardId);
    return found?.card ?? null;
  }, [board, openCardId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleAddCard(columnId, content) {
    socketRef.current?.emit('add_card', {
      columnId,
      content,
      authorName: name,
    });
  }

  function handleAddComment(cardId, content) {
    socketRef.current?.emit('add_comment', {
      cardId,
      content,
      authorName: name,
    });
  }

  async function handleAddColumn(e) {
    e.preventDefault();
    const title = newColumnTitle.trim();
    if (!title) return;
    try {
      const { column } = await api.createColumn(board.id, title);
      setBoard((b) =>
        b
          ? {
              ...b,
              columns: [...b.columns, { ...column, cards: [] }],
            }
          : b,
      );
      setNewColumnTitle('');
      setAddingColumn(false);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleDragStart(event) {
    setActiveDragId(event.active.id);
  }

  function handleDragEnd(event) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || !board) return;
    const cardId = active.id;
    const from = findCard(board, cardId);
    if (!from) return;

    let targetColumnId = null;
    let targetIndex = 0;

    if (over.data.current?.type === 'column') {
      targetColumnId = over.data.current.columnId;
      const col = board.columns.find((c) => c.id === targetColumnId);
      targetIndex = col ? col.cards.length : 0;
    } else if (over.data.current?.type === 'card') {
      targetColumnId = over.data.current.columnId;
      const col = board.columns.find((c) => c.id === targetColumnId);
      if (!col) return;
      const overIdx = col.cards.findIndex((c) => c.id === over.id);
      if (from.column.id === targetColumnId) {
        const fromIdx = col.cards.findIndex((c) => c.id === cardId);
        targetIndex = overIdx;
        if (fromIdx === overIdx) return;
      } else {
        targetIndex = overIdx;
      }
    } else {
      return;
    }

    // Optimistic update.
    setBoard((b) => {
      if (!b) return b;
      let moving = null;
      const columns = b.columns.map((col) => {
        if (col.id === from.column.id) {
          return {
            ...col,
            cards: col.cards.filter((c) => {
              if (c.id === cardId) {
                moving = c;
                return false;
              }
              return true;
            }),
          };
        }
        return col;
      });
      if (!moving) return b;
      return {
        ...b,
        columns: columns.map((col) => {
          if (col.id === targetColumnId) {
            const cards = [...col.cards];
            const idx = Math.max(0, Math.min(targetIndex, cards.length));
            cards.splice(idx, 0, { ...moving, column_id: targetColumnId });
            return { ...col, cards };
          }
          return col;
        }),
      };
    });

    socketRef.current?.emit('move_card', {
      cardId,
      targetColumnId,
      targetIndex,
    });
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyTooltip('Link copied');
    } catch {
      setCopyTooltip('Copy failed');
    }
    setTimeout(() => setCopyTooltip(''), 1600);
  }

  if (loading) {
    return (
      <div className="board-loading">
        <div className="spinner" aria-hidden />
        <p>Loading board…</p>
      </div>
    );
  }
  if (error && !board) {
    return (
      <div className="board-error">
        <h2>Something went wrong</h2>
        <p>{error}</p>
        <Link to="/" className="btn ghost">
          Back to boards
        </Link>
      </div>
    );
  }
  if (!board) return null;

  const activeCard = activeDragId ? findCard(board, activeDragId)?.card : null;

  return (
    <div className="board-page">
      <NameModal open={!name} onSubmit={(n) => setName(n)} />

      <div className="board-toolbar">
        <div className="board-toolbar-left">
          <Link to="/" className="back-link" aria-label="Back to boards">
            ←
          </Link>
          <div>
            <div className="board-eyebrow">Retrospective</div>
            <h1 className="board-title">{board.title}</h1>
          </div>
        </div>
        <div className="board-toolbar-right">
          <div className={`connection ${connected ? 'ok' : 'bad'}`}>
            <span className="pulse" aria-hidden />
            {connected ? 'Live' : 'Reconnecting'}
          </div>
          <div className="presence" title={`${presence} connected`}>
            <span aria-hidden>👥</span> {presence}
          </div>
          <button className="btn ghost" onClick={handleCopyLink}>
            {copyTooltip || 'Share link'}
          </button>
          <a
            className="btn primary"
            href={api.exportUrl(board.id)}
            download
          >
            <span aria-hidden>⬇</span> Export CSV
          </a>
        </div>
      </div>

      {error && <div className="banner-error">{error}</div>}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDragId(null)}
      >
        <div className="columns-scroll">
          <div className="columns">
            {board.columns.map((col, i) => (
              <Column
                key={col.id}
                column={col}
                index={i}
                onAddCard={handleAddCard}
                onOpenComments={(card) => setOpenCardId(card.id)}
              />
            ))}

            <div className="column column-adder">
              {addingColumn ? (
                <form onSubmit={handleAddColumn} className="add-column-form">
                  <input
                    autoFocus
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    placeholder="Column title"
                    maxLength={60}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setAddingColumn(false);
                        setNewColumnTitle('');
                      }
                    }}
                  />
                  <div className="add-card-actions">
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={() => {
                        setAddingColumn(false);
                        setNewColumnTitle('');
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn primary small"
                      disabled={!newColumnTitle.trim()}
                    >
                      Add column
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  className="add-column-btn"
                  onClick={() => setAddingColumn(true)}
                >
                  <span className="plus" aria-hidden>+</span> Add column
                </button>
              )}
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <div className="card is-dragging card-overlay">
              <div className="card-content">{activeCard.content}</div>
              <div className="card-foot">
                <span className="author-name">{activeCard.author_name}</span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <CommentsPanel
        card={openCard}
        onClose={() => setOpenCardId(null)}
        onAddComment={handleAddComment}
      />
    </div>
  );
}
