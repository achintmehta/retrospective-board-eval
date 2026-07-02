import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import {
  api,
  type BoardColumn,
  type BoardDetail,
  type Card,
  type Comment,
} from '../api';
import { getDisplayName, setDisplayName } from '../session';
import { getSocket, type SocketAck } from '../socket';
import { NameGate } from '../components/NameGate';
import { CardOverlay, CardView } from '../components/CardView';
import { AddCardForm } from '../components/AddCardForm';
import { CardDetailModal } from '../components/CardDetailModal';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
}

type CardMap = Record<string, Card>;

function collectCards(board: BoardDetail): CardMap {
  const map: CardMap = {};
  for (const col of board.columns) {
    for (const card of col.cards) map[card.id] = card;
  }
  return map;
}

export function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(() => getDisplayName());
  const [connected, setConnected] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const boardRef = useRef<BoardDetail | null>(null);
  boardRef.current = board;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch board
  useEffect(() => {
    if (!id) return;
    let alive = true;
    setBoard(null);
    setError(null);
    api
      .getBoard(id)
      .then((b) => {
        if (alive) setBoard(b);
      })
      .catch((err) => {
        if (alive) setError(err.message ?? 'Failed to load board');
      });
    return () => {
      alive = false;
    };
  }, [id]);

  // Socket lifecycle
  useEffect(() => {
    if (!id || !board || !name) return;

    const socket = getSocket();

    const join = () => {
      socket.emit('join_board', id, (ack: SocketAck) => {
        if (!ack?.ok) setError(ack?.error ?? 'Failed to join board');
      });
    };

    const onConnect = () => {
      setConnected(true);
      join();
      // On reconnect, refetch to correct any drift
      api
        .getBoard(id)
        .then((b) => setBoard(b))
        .catch(() => {});
    };
    const onDisconnect = () => setConnected(false);

    const onCardAdded = (payload: { board_id: string; card: Card }) => {
      if (payload.board_id !== id) return;
      setBoard((prev) => (prev ? applyCardAdded(prev, payload.card) : prev));
    };
    const onCardMoved = (payload: { board_id: string; card: Card }) => {
      if (payload.board_id !== id) return;
      setBoard((prev) => (prev ? applyCardMoved(prev, payload.card) : prev));
    };
    const onCommentAdded = (payload: {
      board_id: string;
      comment: Comment;
    }) => {
      if (payload.board_id !== id) return;
      setBoard((prev) =>
        prev ? applyCommentAdded(prev, payload.comment) : prev
      );
    };
    const onColumnAdded = (payload: {
      board_id: string;
      column: BoardColumn;
    }) => {
      if (payload.board_id !== id) return;
      setBoard((prev) => (prev ? applyColumnAdded(prev, payload.column) : prev));
    };

    if (socket.connected) {
      setConnected(true);
      join();
    }
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);
    socket.on('column_added', onColumnAdded);

    return () => {
      socket.emit('leave_board', id);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
      socket.off('column_added', onColumnAdded);
    };
  }, [id, board?.id, name]);

  const cardMap = useMemo(
    () => (board ? collectCards(board) : {}),
    [board]
  );

  const columnOfCard = useCallback(
    (cardId: string): BoardColumn | undefined => {
      return board?.columns.find((c) => c.cards.some((card) => card.id === cardId));
    },
    [board]
  );

  const handleName = (n: string) => {
    setDisplayName(n);
    setName(n);
  };

  const handleAddCard = (columnId: string, content: string) => {
    if (!id || !name) return;
    const socket = getSocket();
    socket.emit(
      'add_card',
      {
        board_id: id,
        column_id: columnId,
        content,
        author_name: name,
      },
      (ack: SocketAck) => {
        if (!ack?.ok) setError(ack?.error ?? 'Failed to add card');
      }
    );
  };

  const handleAddComment = (cardId: string, content: string) => {
    if (!id || !name) return;
    const socket = getSocket();
    socket.emit(
      'add_comment',
      {
        board_id: id,
        card_id: cardId,
        content,
        author_name: name,
      },
      (ack: SocketAck) => {
        if (!ack?.ok) setError(ack?.error ?? 'Failed to add comment');
      }
    );
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveCardId(String(e.active.id));
  };

  const handleDragOver = (e: DragOverEvent) => {
    // Provide visual highlight for target columns; no state mutation here.
    void e;
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveCardId(null);
    const activeId = String(e.active.id);
    if (!e.over) return;
    const overId = String(e.over.id);
    if (!board || !id) return;

    const overType = e.over.data.current?.type;
    let toColumnId: string;
    let toPosition: number;

    const sourceColumn = columnOfCard(activeId);
    if (!sourceColumn) return;

    if (overType === 'column') {
      // Dropped into empty area of column
      toColumnId = overId;
      const targetCol = board.columns.find((c) => c.id === toColumnId);
      if (!targetCol) return;
      toPosition =
        targetCol.id === sourceColumn.id
          ? targetCol.cards.length - 1
          : targetCol.cards.length;
    } else {
      // Dropped over another card
      const targetCol = board.columns.find((c) =>
        c.cards.some((card) => card.id === overId)
      );
      if (!targetCol) return;
      toColumnId = targetCol.id;
      const overCardIndex = targetCol.cards.findIndex((c) => c.id === overId);
      if (targetCol.id === sourceColumn.id) {
        const sourceIndex = sourceColumn.cards.findIndex(
          (c) => c.id === activeId
        );
        if (sourceIndex === overCardIndex) return;
        toPosition = overCardIndex;
      } else {
        toPosition = overCardIndex;
      }
    }

    // Optimistic update
    setBoard((prev) =>
      prev
        ? applyCardMoved(prev, {
            ...cardMap[activeId],
            column_id: toColumnId,
            position: toPosition,
          })
        : prev
    );

    const socket = getSocket();
    socket.emit(
      'move_card',
      {
        board_id: id,
        card_id: activeId,
        to_column_id: toColumnId,
        to_position: toPosition,
      },
      (ack: SocketAck) => {
        if (!ack?.ok) {
          setError(ack?.error ?? 'Failed to move card');
          // Refetch to reconcile
          if (id) api.getBoard(id).then(setBoard).catch(() => {});
        }
      }
    );
  };

  const handleAddColumn = async () => {
    if (!id || !newColumnTitle.trim()) return;
    try {
      await api.createColumn(id, newColumnTitle.trim());
      setNewColumnTitle('');
      setAddingColumn(false);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!name) {
    return <NameGate onSubmit={handleName} boardTitle={board?.title} />;
  }

  if (error && !board) {
    return (
      <div className="empty-state">
        <h2>{error}</h2>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Back to boards
        </button>
      </div>
    );
  }

  if (!board) return <div className="spinner" />;

  const openCard = openCardId ? cardMap[openCardId] : null;
  const openCardColumn = openCard
    ? board.columns.find((c) => c.id === openCard.column_id)
    : null;
  const activeCard = activeCardId ? cardMap[activeCardId] : null;
  const activeCol = activeCard
    ? board.columns.find((c) => c.id === activeCard.column_id)
    : null;

  return (
    <>
      <div className="board-header">
        <div className="board-header-titles">
          <span className="board-eyebrow">
            Retro board
            <span
              className="presence-indicator"
              data-offline={connected ? 'false' : 'true'}
            >
              {connected ? 'Live' : 'Offline'}
            </span>
          </span>
          <h1 className="board-title">{board.title}</h1>
        </div>
        <div className="board-actions">
          <span className="who-tag">
            <span className="who-avatar">{initials(name) || '?'}</span>
            {name}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setAddingColumn(true)}
          >
            + Column
          </button>
          <a
            href={api.exportUrl(board.id)}
            className="btn btn-primary btn-sm"
            download
          >
            Export CSV
          </a>
        </div>
      </div>

      {error && (
        <div className="error-banner" onClick={() => setError(null)}>
          {error}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="board-columns">
          {board.columns.map((col) => (
            <ColumnView
              key={col.id}
              column={col}
              onAddCard={(content) => handleAddCard(col.id, content)}
              onOpenCard={(card) => setOpenCardId(card.id)}
              isDraggingOverBoard={activeCardId != null}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeCard && activeCol ? (
            <CardOverlay card={activeCard} accent={activeCol.accent} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {openCard && openCardColumn && (
        <CardDetailModal
          card={openCard}
          accent={openCardColumn.accent}
          onClose={() => setOpenCardId(null)}
          onAddComment={(content) => handleAddComment(openCard.id, content)}
        />
      )}

      {addingColumn && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAddingColumn(false);
          }}
        >
          <form
            className="modal"
            onSubmit={(e) => {
              e.preventDefault();
              handleAddColumn();
            }}
          >
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Add a column</h2>
                <p className="modal-sub">
                  Give it a short, action-oriented name (e.g. "Kudos").
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setAddingColumn(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="new-column">
                Column title
              </label>
              <input
                id="new-column"
                className="input"
                autoFocus
                value={newColumnTitle}
                maxLength={40}
                onChange={(e) => setNewColumnTitle(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setAddingColumn(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!newColumnTitle.trim()}
              >
                Add column
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

/* --------- Column view --------- */
function ColumnView({
  column,
  onAddCard,
  onOpenCard,
  isDraggingOverBoard,
}: {
  column: BoardColumn;
  onAddCard: (content: string) => void;
  onOpenCard: (card: Card) => void;
  isDraggingOverBoard: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column' },
  });

  return (
    <div
      className="column"
      data-accent={column.accent}
      data-over={isOver && isDraggingOverBoard ? 'true' : 'false'}
      ref={setNodeRef}
    >
      <div className="column-header">
        <span className="column-accent" />
        <h2 className="column-title">{column.title}</h2>
        <span className="column-count">{column.cards.length}</span>
      </div>

      <SortableContext
        items={column.cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="column-body">
          {column.cards.map((card) => (
            <CardView
              key={card.id}
              card={card}
              accent={column.accent}
              onOpen={onOpenCard}
            />
          ))}
        </div>
      </SortableContext>

      <div className="column-footer">
        <AddCardForm onAdd={onAddCard} />
      </div>
    </div>
  );
}

/* --------- Reducer helpers --------- */
function applyCardAdded(board: BoardDetail, card: Card): BoardDetail {
  return {
    ...board,
    columns: board.columns.map((col) =>
      col.id === card.column_id
        ? {
            ...col,
            cards: col.cards.some((c) => c.id === card.id)
              ? col.cards
              : [...col.cards, { ...card, comments: [] }].sort(
                  (a, b) => a.position - b.position
                ),
          }
        : col
    ),
  };
}

function applyCardMoved(board: BoardDetail, moved: Card): BoardDetail {
  // Preserve existing comments — moved payload from the server doesn't include them.
  const existing = board.columns
    .flatMap((c) => c.cards)
    .find((c) => c.id === moved.id);
  const preservedComments = existing?.comments ?? [];

  return {
    ...board,
    columns: board.columns.map((col) => {
      // Remove card from any column it may currently be in
      const withoutCard = col.cards.filter((c) => c.id !== moved.id);
      if (col.id === moved.column_id) {
        const nextCard: Card = {
          ...(existing ?? moved),
          ...moved,
          comments: preservedComments,
        };
        const inserted = [...withoutCard];
        inserted.splice(Math.max(0, Math.min(moved.position, inserted.length)), 0, nextCard);
        // Renumber positions so subsequent drops behave predictably
        return {
          ...col,
          cards: inserted.map((c, idx) => ({ ...c, position: idx })),
        };
      }
      if (withoutCard.length === col.cards.length) return col;
      return {
        ...col,
        cards: withoutCard.map((c, idx) => ({ ...c, position: idx })),
      };
    }),
  };
}

function applyCommentAdded(board: BoardDetail, comment: Comment): BoardDetail {
  return {
    ...board,
    columns: board.columns.map((col) => ({
      ...col,
      cards: col.cards.map((card) =>
        card.id === comment.card_id
          ? {
              ...card,
              comments: card.comments.some((c) => c.id === comment.id)
                ? card.comments
                : [...card.comments, comment].sort(
                    (a, b) => a.created_at - b.created_at
                  ),
            }
          : card
      ),
    })),
  };
}

function applyColumnAdded(board: BoardDetail, column: BoardColumn): BoardDetail {
  if (board.columns.some((c) => c.id === column.id)) return board;
  return {
    ...board,
    columns: [...board.columns, { ...column, cards: [] }].sort(
      (a, b) => a.position - b.position
    ),
  };
}
