import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

import Topbar from '../components/Topbar.jsx';
import GuestAuthModal from '../components/GuestAuthModal.jsx';
import Column from '../components/Column.jsx';
import CardItem from '../components/CardItem.jsx';
import CardDetailModal from '../components/CardDetailModal.jsx';
import { useToast } from '../components/Toasts.jsx';

import { api } from '../lib/api';
import { getSocket, emitWithAck } from '../lib/socket';
import { getStoredName, initials } from '../lib/identity';

function sortByPosition(arr) {
  return [...arr].sort((a, b) => a.position - b.position);
}

export default function BoardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [displayName, setDisplayName] = useState(() => getStoredName());
  const [board, setBoard] = useState(null);
  const [cards, setCards] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [activeCardId, setActiveCardId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getBoard(id);
        if (cancelled) return;
        setBoard({ id: data.id, title: data.title, created_at: data.created_at, columns: sortByPosition(data.columns) });
        setCards(sortByPosition(data.cards));
        setComments(data.comments);
      } catch (err) {
        toast.push(err.message, { kind: 'error' });
        navigate('/');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, navigate, toast]);

  useEffect(() => {
    if (!board || !displayName) return;
    const socket = getSocket();

    const join = () => {
      socket.emit('join_board', { boardId: board.id, name: displayName }, (resp) => {
        if (!resp?.ok) {
          toast.push(resp?.error || 'Failed to join board', { kind: 'error' });
          return;
        }
        const fresh = resp.board;
        setBoard((prev) => prev ? { ...prev, columns: sortByPosition(fresh.columns) } : prev);
        setCards(sortByPosition(fresh.cards));
        setComments(fresh.comments);
      });
    };

    const onConnect = () => { setConnected(true); join(); };
    const onDisconnect = () => setConnected(false);
    const onCardAdded = ({ card }) => {
      setCards((curr) => {
        if (curr.some((c) => c.id === card.id)) return curr;
        return sortByPosition([...curr, card]);
      });
    };
    const onCardMoved = ({ sourceCards, targetCards, fromColumnId, toColumnId }) => {
      setCards((curr) => {
        const affectedColumnIds = new Set([fromColumnId, toColumnId]);
        const others = curr.filter((c) => !affectedColumnIds.has(c.column_id));
        const merged = [...others, ...sourceCards, ...targetCards];
        const seen = new Set();
        const deduped = [];
        for (const c of merged) {
          if (seen.has(c.id)) continue;
          seen.add(c.id);
          deduped.push(c);
        }
        return sortByPosition(deduped);
      });
    };
    const onCommentAdded = ({ comment }) => {
      setComments((curr) => {
        if (curr.some((c) => c.id === comment.id)) return curr;
        return [...curr, comment];
      });
    };
    const onColumnAdded = ({ column }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        if (prev.columns.some((c) => c.id === column.id)) return prev;
        return { ...prev, columns: sortByPosition([...prev.columns, column]) };
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);
    socket.on('column_added', onColumnAdded);

    if (socket.connected) { setConnected(true); join(); }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
      socket.off('column_added', onColumnAdded);
    };
  }, [board?.id, displayName, toast]);

  const cardsByColumn = useMemo(() => {
    const map = new Map();
    (board?.columns || []).forEach((col) => map.set(col.id, []));
    for (const card of cards) {
      const arr = map.get(card.column_id);
      if (arr) arr.push(card);
      else map.set(card.column_id, [card]);
    }
    return map;
  }, [board?.columns, cards]);

  const commentsByCard = useMemo(() => {
    const map = new Map();
    for (const c of comments) {
      const arr = map.get(c.card_id) || [];
      arr.push(c);
      map.set(c.card_id, arr);
    }
    return map;
  }, [comments]);

  const commentCountByCard = useMemo(() => {
    const m = new Map();
    for (const [k, v] of commentsByCard.entries()) m.set(k, v.length);
    return m;
  }, [commentsByCard]);

  const handleAddCard = useCallback(async (columnId, content) => {
    try {
      await emitWithAck('add_card', {
        columnId,
        content,
        authorName: displayName,
      });
    } catch (err) {
      toast.push(err.message, { kind: 'error' });
      throw err;
    }
  }, [displayName, toast]);

  const handleAddComment = useCallback(async (cardId, content) => {
    try {
      await emitWithAck('add_comment', {
        cardId,
        content,
        authorName: displayName,
      });
    } catch (err) {
      toast.push(err.message, { kind: 'error' });
      throw err;
    }
  }, [displayName, toast]);

  const handleAddColumn = useCallback(async () => {
    const title = window.prompt('Column title');
    if (!title?.trim()) return;
    try {
      const col = await api.createColumn(board.id, title.trim());
      setBoard((prev) => prev ? { ...prev, columns: sortByPosition([...prev.columns, col]) } : prev);
    } catch (err) {
      toast.push(err.message, { kind: 'error' });
    }
  }, [board, toast]);

  const findColumnIdForCard = (cardId) => {
    const card = cardsRef.current.find((c) => c.id === cardId);
    return card?.column_id;
  };

  const resolveDropTarget = (event) => {
    const { active, over } = event;
    if (!over) return null;
    const overData = over.data?.current;
    if (overData?.type === 'column') {
      return { columnId: overData.columnId, overCardId: null };
    }
    if (overData?.type === 'card') {
      return { columnId: overData.columnId, overCardId: over.id };
    }
    const fallbackColId = findColumnIdForCard(over.id);
    return fallbackColId ? { columnId: fallbackColId, overCardId: over.id } : null;
  };

  const onDragStart = (event) => setDraggingId(event.active.id);

  const applyMove = (curr, activeId, toColumnId, overCardId) => {
    const card = curr.find((c) => c.id === activeId);
    if (!card) return { next: curr, toIndex: 0 };
    const targetCards = curr.filter((c) => c.column_id === toColumnId && c.id !== activeId);
    let insertAt = targetCards.length;
    if (overCardId && overCardId !== activeId) {
      const idx = targetCards.findIndex((c) => c.id === overCardId);
      if (idx >= 0) insertAt = idx;
    }
    insertAt = Math.max(0, Math.min(insertAt, targetCards.length));

    const moved = { ...card, column_id: toColumnId };
    const newTarget = [...targetCards];
    newTarget.splice(insertAt, 0, moved);
    const renumberedTarget = newTarget.map((c, i) => ({ ...c, position: i }));

    const sourceColumnId = card.column_id;
    const sourceRenumbered =
      sourceColumnId === toColumnId
        ? []
        : curr
            .filter((c) => c.column_id === sourceColumnId && c.id !== activeId)
            .map((c, i) => ({ ...c, position: i }));

    const others = curr.filter(
      (c) => c.column_id !== toColumnId && c.column_id !== sourceColumnId
    );

    return {
      next: sortByPosition([...others, ...sourceRenumbered, ...renumberedTarget]),
      toIndex: insertAt,
    };
  };

  const onDragOver = (event) => {
    const target = resolveDropTarget(event);
    if (!target) return;
    const activeId = event.active.id;
    setCards((curr) => {
      const card = curr.find((c) => c.id === activeId);
      if (!card) return curr;
      if (card.column_id === target.columnId) return curr;
      const { next } = applyMove(curr, activeId, target.columnId, target.overCardId);
      return next;
    });
  };

  const onDragEnd = async (event) => {
    setDraggingId(null);
    const target = resolveDropTarget(event);
    if (!target) return;
    const activeId = event.active.id;

    let toIndex = 0;
    setCards((curr) => {
      const result = applyMove(curr, activeId, target.columnId, target.overCardId);
      toIndex = result.toIndex;
      return result.next;
    });

    try {
      await emitWithAck('move_card', {
        cardId: activeId,
        toColumnId: target.columnId,
        toIndex,
      });
    } catch (err) {
      toast.push(err.message, { kind: 'error' });
      try {
        const data = await api.getBoard(board.id);
        setCards(sortByPosition(data.cards));
      } catch {}
    }
  };

  const activeCard = useMemo(
    () => (activeCardId ? cards.find((c) => c.id === activeCardId) : null),
    [activeCardId, cards]
  );

  const activeCardColumn = useMemo(() => {
    if (!activeCard) return null;
    return board?.columns?.find((c) => c.id === activeCard.column_id) || null;
  }, [activeCard, board]);

  const draggingCard = draggingId ? cards.find((c) => c.id === draggingId) : null;

  const handleExport = () => {
    window.location.href = api.exportUrl(board.id);
  };

  if (!displayName) {
    return (
      <div className="app-shell">
        <Topbar
          right={
            <div className="live-indicator offline">
              <span className="dot" /> Sign in to join
            </div>
          }
        />
        <main>
          {loading ? (
            <div className="row dim"><span className="spinner" /> Loading…</div>
          ) : (
            <div className="dim">Waiting for display name…</div>
          )}
        </main>
        <GuestAuthModal
          defaultName=""
          onSubmit={(name) => setDisplayName(name)}
        />
      </div>
    );
  }

  if (loading || !board) {
    return (
      <div className="app-shell">
        <Topbar />
        <main>
          <div className="row dim"><span className="spinner" /> Loading board…</div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Topbar
        right={
          <>
            <span
              className={'live-indicator' + (connected ? '' : ' offline')}
              title={connected ? 'Connected and syncing in real time' : 'Disconnected'}
            >
              <span className="dot" />
              {connected ? 'Live' : 'Reconnecting…'}
            </span>
            <span className="identity-chip">
              <span className="avatar" aria-hidden>{initials(displayName)}</span>
              <span>{displayName}</span>
            </span>
          </>
        }
      />
      <main>
        <div className="board-header">
          <div>
            <h1>{board.title}</h1>
            <div className="board-meta">
              {new Date(board.created_at).toLocaleString()} · {cards.length} cards · {comments.length} comments
            </div>
          </div>
          <div className="board-actions">
            <button className="btn" onClick={handleAddColumn} id="add-column-button">
              + Add column
            </button>
            <button
              className="btn"
              onClick={handleExport}
              id="export-csv-button"
              title="Download a CSV of cards and comments"
            >
              ↓ Export CSV
            </button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={() => setDraggingId(null)}
        >
          <div className="columns-scroll">
            {board.columns.map((col, idx) => (
              <Column
                key={col.id}
                column={col}
                index={idx}
                cards={cardsByColumn.get(col.id) || []}
                commentCountByCard={commentCountByCard}
                onAddCard={handleAddCard}
                onOpenCard={(card) => setActiveCardId(card.id)}
              />
            ))}
          </div>

          <DragOverlay>
            {draggingCard ? (
              <CardItem card={draggingCard} dragOverlay commentCount={commentCountByCard.get(draggingCard.id) || 0} />
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {activeCard && (
        <CardDetailModal
          card={activeCard}
          columnTitle={activeCardColumn?.title || ''}
          comments={commentsByCard.get(activeCard.id) || []}
          onAddComment={handleAddComment}
          onClose={() => setActiveCardId(null)}
        />
      )}
    </div>
  );
}
