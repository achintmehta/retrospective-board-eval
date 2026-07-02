import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { api } from '../api';
import { getSocket } from '../socket';
import { getDisplayName, setDisplayName } from '../session';
import type { BoardDetail, Card, CardWithComments, Column, Comment } from '../types';
import { Nav } from '../components/Nav';
import { GuestAuthModal } from '../components/GuestAuthModal';
import { ColumnView } from '../components/ColumnView';
import { CardOverlay } from '../components/CardView';

export function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const boardId = id!;

  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [displayName, setName] = useState<string | null>(getDisplayName());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const [activeCard, setActiveCard] = useState<CardWithComments | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const socket = useMemo(() => getSocket(), []);

  // Load board
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getBoard(boardId)
      .then((b) => {
        if (!cancelled) setBoard(b);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  // Socket wiring: connect + join room + refetch on reconnect
  useEffect(() => {
    if (!board) return;

    const onConnect = () => {
      setConnected(true);
      socket.emit('join_board', { boardId });
      // Refetch board on (re)connect to reconcile state.
      api.getBoard(boardId).then(setBoard).catch(() => undefined);
    };
    const onDisconnect = () => setConnected(false);

    if (socket.connected) {
      onConnect();
    }
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    const onCardAdded = ({ card }: { card: Card }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === card.column_id && !col.cards.some((c) => c.id === card.id)
              ? { ...col, cards: [...col.cards, { ...card, comments: [] }] }
              : col,
          ),
        };
      });
    };

    const onCardMoved = ({ card }: { card: Card }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        // Find the existing card (if any) so we can preserve its comments.
        let existing: CardWithComments | undefined;
        for (const col of prev.columns) {
          const found = col.cards.find((c) => c.id === card.id);
          if (found) {
            existing = found;
            break;
          }
        }
        const carry: CardWithComments = existing
          ? { ...existing, column_id: card.column_id, position: card.position }
          : { ...card, comments: [] };
        const withoutCard = prev.columns.map((col) => ({
          ...col,
          cards: col.cards.filter((c) => c.id !== card.id),
        }));
        return {
          ...prev,
          columns: withoutCard.map((col) => {
            if (col.id !== card.column_id) return col;
            const cards = [...col.cards];
            const insertAt = Math.min(Math.max(card.position, 0), cards.length);
            cards.splice(insertAt, 0, carry);
            return { ...col, cards };
          }),
        };
      });
    };

    const onCommentAdded = ({ comment }: { comment: Comment }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            cards: col.cards.map((c) =>
              c.id === comment.card_id && !c.comments.some((cm) => cm.id === comment.id)
                ? { ...c, comments: [...c.comments, comment] }
                : c,
            ),
          })),
        };
      });
    };

    const onColumnAdded = ({ column }: { column: Column }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        if (prev.columns.some((c) => c.id === column.id)) return prev;
        return { ...prev, columns: [...prev.columns, { ...column, cards: [] }] };
      });
    };

    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);
    socket.on('column_added', onColumnAdded);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
      socket.off('column_added', onColumnAdded);
      socket.emit('leave_board', { boardId });
    };
  }, [board?.id, boardId, socket]);

  const handleAddCard = useCallback(
    (columnId: string, content: string) => {
      if (!displayName) return;
      socket.emit('add_card', { boardId, columnId, content, authorName: displayName });
    },
    [boardId, displayName, socket],
  );

  const handleAddComment = useCallback(
    (cardId: string, content: string) => {
      if (!displayName) return;
      socket.emit('add_comment', { boardId, cardId, content, authorName: displayName });
    },
    [boardId, displayName, socket],
  );

  const handleAddColumn = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const t = newColumnTitle.trim();
      if (!t) return;
      socket.emit('add_column', { boardId, title: t });
      setNewColumnTitle('');
    },
    [boardId, newColumnTitle, socket],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const findCard = useCallback(
    (cardId: string): { card: CardWithComments; columnId: string } | null => {
      if (!board) return null;
      for (const col of board.columns) {
        const card = col.cards.find((c) => c.id === cardId);
        if (card) return { card, columnId: col.id };
      }
      return null;
    },
    [board],
  );

  const onDragStart = (e: DragStartEvent) => {
    const found = findCard(String(e.active.id));
    if (found) setActiveCard(found.card);
  };

  const onDragOver = (e: DragOverEvent) => {
    const over = e.over;
    if (!over) {
      setOverColumnId(null);
      return;
    }
    const overType = over.data.current?.type;
    if (overType === 'column') {
      setOverColumnId(String(over.data.current?.columnId));
    } else if (overType === 'card') {
      setOverColumnId(String(over.data.current?.columnId));
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveCard(null);
    setOverColumnId(null);
    const { active, over } = e;
    if (!over || !board) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeFound = findCard(activeId);
    if (!activeFound) return;

    let targetColumnId: string;
    let targetPosition: number | null;

    if (over.data.current?.type === 'column') {
      targetColumnId = String(over.data.current.columnId);
      const targetCol = board.columns.find((c) => c.id === targetColumnId);
      targetPosition = targetCol ? targetCol.cards.length : null;
      if (activeFound.columnId === targetColumnId) {
        // No-op: dropped on own column background, keep position.
        return;
      }
    } else if (over.data.current?.type === 'card') {
      targetColumnId = String(over.data.current.columnId);
      const targetCol = board.columns.find((c) => c.id === targetColumnId);
      if (!targetCol) return;
      const overIndex = targetCol.cards.findIndex((c) => c.id === overId);
      if (overIndex === -1) return;
      targetPosition = overIndex;
      if (activeFound.columnId === targetColumnId) {
        const fromIndex = targetCol.cards.findIndex((c) => c.id === activeId);
        if (fromIndex === overIndex) return;
        // Optimistically reorder within column
        setBoard((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            columns: prev.columns.map((c) =>
              c.id === targetColumnId
                ? { ...c, cards: arrayMove(c.cards, fromIndex, overIndex) }
                : c,
            ),
          };
        });
      }
    } else {
      return;
    }

    socket.emit('move_card', {
      boardId,
      cardId: activeId,
      targetColumnId,
      targetPosition,
    });
  };

  // ------- Render -------

  if (!displayName) {
    return (
      <div className="app-shell">
        <Nav />
        {board && (
          <GuestAuthModal
            boardTitle={board.title}
            onSubmit={(name) => {
              setDisplayName(name);
              setName(name);
            }}
          />
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-shell">
        <Nav />
        <div className="center"><div className="spinner" /></div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="app-shell">
        <Nav />
        <div className="center">
          <div className="error-banner">{error ?? 'Board not found.'}</div>
          <Link to="/" className="btn btn-ghost" style={{ marginTop: 16 }}>
            ← Back home
          </Link>
        </div>
      </div>
    );
  }

  const totalCards = board.columns.reduce((n, c) => n + c.cards.length, 0);

  return (
    <div className="app-shell">
      <Nav
        right={
          <>
            <span className="presence-chip">
              <span className={`presence-dot${connected ? '' : ' offline'}`} />
              {connected ? 'Connected' : 'Reconnecting…'}
            </span>
            <span className="presence-chip" title="You are signed in as">
              You: <b style={{ marginLeft: 4, color: 'var(--text)' }}>{displayName}</b>
            </span>
          </>
        }
      />
      <main className="board-page">
        <header className="board-header">
          <div>
            <h1 className="board-title">{board.title}</h1>
            <div className="board-subtitle">
              {board.columns.length} columns · {totalCards} cards
            </div>
          </div>
          <div className="board-actions">
            <a
              className="btn btn-ghost"
              href={api.exportUrl(board.id)}
              download
              title="Download board contents as CSV"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </a>
            <Link to="/" className="btn btn-ghost">← Home</Link>
          </div>
        </header>

        <DndContext
          sensors={sensors}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={() => {
            setActiveCard(null);
            setOverColumnId(null);
          }}
        >
          <div className="columns">
            {board.columns.map((column) => (
              <ColumnView
                key={column.id}
                column={column}
                isDropTarget={overColumnId === column.id}
                onAddCard={handleAddCard}
                onAddComment={handleAddComment}
              />
            ))}

            <form className="add-column" onSubmit={handleAddColumn}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>New column</div>
              <input
                className="input"
                placeholder="Column title"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                maxLength={60}
              />
              <button className="btn btn-primary btn-sm" disabled={!newColumnTitle.trim()}>
                Add column
              </button>
            </form>
          </div>

          <DragOverlay>
            {activeCard ? <CardOverlay card={activeCard} /> : null}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
}
