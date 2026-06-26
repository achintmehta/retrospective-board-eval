import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { api } from '../lib/api.js';
import { getDisplayName, setDisplayName, colorForName, initials } from '../lib/session.js';
import { formatRelative } from '../lib/format.js';
import { useToast } from '../hooks/useToast.js';
import { useBoardSocket } from '../hooks/useBoardSocket.js';
import { boardReducer } from '../state/boardReducer.js';
import GuestAuthModal from '../components/GuestAuthModal.jsx';
import Column from '../components/Column.jsx';
import CardDrawer from '../components/CardDrawer.jsx';
import './BoardPage.css';

export default function BoardPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const [board, dispatch] = useReducer(boardReducer, null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayNameState] = useState(getDisplayName());
  const [authOpen, setAuthOpen] = useState(false);
  const [activeCard, setActiveCard] = useState(null);
  const [openCardId, setOpenCardId] = useState(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [columnDraft, setColumnDraft] = useState('');
  const { toast, show } = useToast();
  const boardRef = useRef(board);
  boardRef.current = board;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSocketEvent = useCallback((event, payload) => {
    dispatch({ type: event, ...payload });
  }, []);

  const { status, presence, emit } = useBoardSocket({
    boardId,
    displayName,
    enabled: Boolean(displayName) && Boolean(board),
    onEvent: handleSocketEvent,
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getBoard(boardId)
      .then((data) => {
        if (!active) return;
        dispatch({ type: 'set', board: data });
        setLoadError(null);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err);
        if (err.status === 404) {
          navigate('/404', { replace: true });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [boardId, navigate]);

  useEffect(() => {
    if (!loading && board && !displayName) {
      setAuthOpen(true);
    }
  }, [loading, board, displayName]);

  const openCard = useMemo(() => {
    if (!board || !openCardId) return null;
    for (const col of board.columns) {
      const found = col.cards.find((c) => c.id === openCardId);
      if (found) return found;
    }
    return null;
  }, [board, openCardId]);

  const handleAuthSubmit = (name) => {
    const saved = setDisplayName(name);
    setDisplayNameState(saved);
    setAuthOpen(false);
  };

  const handleAddCard = async (columnId, content) => {
    const ack = await emit('add_card', { boardId, columnId, content });
    if (!ack?.ok) {
      show(ack?.error || 'Could not add card', 'error');
    }
  };

  const handleAddComment = async (cardId, content) => {
    const ack = await emit('add_comment', { boardId, cardId, content });
    if (!ack?.ok) {
      show(ack?.error || 'Could not add comment', 'error');
    }
  };

  const handleAddColumn = async (e) => {
    e.preventDefault();
    const value = columnDraft.trim();
    if (!value) return;
    try {
      const column = await api.createColumn(boardId, value);
      dispatch({ type: 'column_added', column });
      // Best-effort broadcast so other clients see it without refetching
      emit('column_created', { boardId, column });
      setColumnDraft('');
      setAddingColumn(false);
    } catch (err) {
      show(err.message || 'Could not add column', 'error');
    }
  };

  const handleExport = () => {
    window.open(api.exportUrl(boardId), '_blank', 'noopener');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      show('Board link copied to clipboard ✨', 'success');
    } catch {
      show('Could not copy link', 'error');
    }
  };

  /* ---------------- Drag & drop ---------------- */
  const findColumnByCardId = useCallback(
    (cardId) => {
      if (!board) return null;
      return board.columns.find((col) => col.cards.some((c) => c.id === cardId));
    },
    [board]
  );

  const handleDragStart = (event) => {
    const id = event.active.id;
    const col = findColumnByCardId(id);
    const found = col?.cards.find((c) => c.id === id);
    setActiveCard(found ?? null);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveCard(null);
    if (!over || !board) return;
    const fromColumn = findColumnByCardId(active.id);
    if (!fromColumn) return;
    const fromIndex = fromColumn.cards.findIndex((c) => c.id === active.id);

    let toColumnId;
    let toIndex;
    if (over.data?.current?.type === 'column') {
      toColumnId = over.data.current.columnId;
      const targetCol = board.columns.find((c) => c.id === toColumnId);
      toIndex = targetCol ? targetCol.cards.length : 0;
    } else if (over.data?.current?.type === 'card') {
      toColumnId = over.data.current.columnId;
      const targetCol = board.columns.find((c) => c.id === toColumnId);
      const overIndex = targetCol?.cards.findIndex((c) => c.id === over.id) ?? -1;
      toIndex = overIndex >= 0 ? overIndex : (targetCol?.cards.length ?? 0);
    } else {
      return;
    }

    if (toColumnId === fromColumn.id && fromIndex === toIndex) return;

    // Optimistic update
    if (toColumnId === fromColumn.id) {
      const updated = {
        ...board,
        columns: board.columns.map((col) => {
          if (col.id !== fromColumn.id) return col;
          return { ...col, cards: arrayMove(col.cards, fromIndex, toIndex) };
        }),
      };
      dispatch({ type: 'set', board: updated });
    } else {
      dispatch({
        type: 'card_moved',
        cardId: active.id,
        fromColumnId: fromColumn.id,
        toColumnId,
        toIndex,
      });
    }

    emit('move_card', {
      boardId,
      cardId: active.id,
      toColumnId,
      toIndex,
    }).then((ack) => {
      if (!ack?.ok) {
        show(ack?.error || 'Move failed; refreshing', 'error');
        // Reload server truth on failure
        api.getBoard(boardId).then((data) => dispatch({ type: 'set', board: data }));
      }
    });
  };

  if (loading) return <BoardSkeleton />;
  if (loadError) {
    return (
      <div className="board-error">
        <h2>Could not load board</h2>
        <p>{loadError.message}</p>
        <Link to="/" className="btn btn-secondary">Back to boards</Link>
      </div>
    );
  }
  if (!board) return null;

  return (
    <div className="board-page">
      <GuestAuthModal
        open={authOpen}
        initialName={displayName}
        boardTitle={board.title}
        onSubmit={handleAuthSubmit}
      />

      <header className="board-header">
        <div className="board-header-left">
          <h1 className="board-title">{board.title}</h1>
          <div className="board-meta">
            <span>Created {formatRelative(board.created_at)}</span>
            <span className="board-meta-sep">·</span>
            <span className="board-id">{board.id}</span>
          </div>
        </div>
        <div className="board-header-right">
          <ConnectionPill status={status} presence={presence} />
          {displayName && (
            <div
              className="board-me"
              title={`Joined as ${displayName}`}
              onClick={() => setAuthOpen(true)}
              role="button"
              tabIndex={0}
            >
              <span
                className="avatar avatar-sm"
                style={{ background: colorForName(displayName) }}
              >
                {initials(displayName)}
              </span>
              <span className="board-me-name">{displayName}</span>
            </div>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopyLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Share
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleExport}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Export CSV
          </button>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={(args) => {
          const intersections = pointerWithin(args);
          if (intersections.length > 0) return intersections;
          return closestCorners(args);
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveCard(null)}
      >
        <div className="board-columns">
          {board.columns.map((column, index) => (
            <Column
              key={column.id}
              column={column}
              index={index}
              onAddCard={handleAddCard}
              onOpenCard={(card) => setOpenCardId(card.id)}
            />
          ))}
          <div className="column column-add">
            {addingColumn ? (
              <form className="column-add-form" onSubmit={handleAddColumn}>
                <input
                  autoFocus
                  className="input"
                  type="text"
                  placeholder="Column title…"
                  value={columnDraft}
                  maxLength={80}
                  onChange={(e) => setColumnDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setAddingColumn(false);
                      setColumnDraft('');
                    }
                  }}
                />
                <div className="card-form-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setAddingColumn(false);
                      setColumnDraft('');
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={!columnDraft.trim()}>
                    Add column
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="column-add-btn"
                onClick={() => setAddingColumn(true)}
              >
                <span className="add-card-icon" aria-hidden="true">+</span>
                Add column
              </button>
            )}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeCard && (
            <article className="card card-overlay">
              <p className="card-content">{activeCard.content}</p>
            </article>
          )}
        </DragOverlay>
      </DndContext>

      <CardDrawer
        card={openCard}
        open={Boolean(openCard)}
        onClose={() => setOpenCardId(null)}
        onAddComment={handleAddComment}
      />

      {toast && <div className="toast" role="status">{toast.message}</div>}
    </div>
  );
}

function ConnectionPill({ status, presence }) {
  const config = {
    idle: { label: 'Idle', tone: 'muted' },
    connecting: { label: 'Connecting…', tone: 'amber' },
    connected: { label: 'Live', tone: 'green' },
    disconnected: { label: 'Reconnecting…', tone: 'amber' },
    error: { label: 'Offline', tone: 'red' },
  }[status] ?? { label: status, tone: 'muted' };
  return (
    <div className={`presence-pill presence-${config.tone}`} title={`Status: ${config.label}`}>
      <span className="presence-dot" />
      <span className="presence-label">{config.label}</span>
      {status === 'connected' && (
        <span className="presence-count">{presence} online</span>
      )}
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="board-page">
      <header className="board-header">
        <div className="board-header-left">
          <div className="skeleton" style={{ width: 260, height: 32, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: 180, height: 14 }} />
        </div>
      </header>
      <div className="board-columns">
        {[0, 1, 2].map((i) => (
          <div key={i} className="column">
            <div className="skeleton" style={{ height: 22, width: '60%', marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 70, marginBottom: 10 }} />
            <div className="skeleton" style={{ height: 70 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
