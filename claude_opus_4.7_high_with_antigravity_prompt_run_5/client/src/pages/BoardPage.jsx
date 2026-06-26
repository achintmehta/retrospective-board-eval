import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { io } from 'socket.io-client';
import { api } from '../lib/api.js';
import { getDisplayName } from '../lib/session.js';
import { boardReducer, findCardLocation } from '../lib/boardReducer.js';
import GuestAuthModal from '../components/GuestAuthModal.jsx';
import Column from '../components/Column.jsx';
import AddColumnTile from '../components/AddColumnTile.jsx';
import { timeAgo } from '../lib/format.js';
import { initials } from '../lib/session.js';
import './BoardPage.css';

const MAX_FEED = 5;

export default function BoardPage() {
  const { id: boardId } = useParams();
  const [board, dispatch] = useReducer(boardReducer, null);
  const [displayName, setName] = useState(getDisplayName());
  const [needsAuth, setNeedsAuth] = useState(!getDisplayName());
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [presenceCount, setPresenceCount] = useState(1);
  const [feed, setFeed] = useState([]);
  const [activeDrag, setActiveDrag] = useState(null);
  const socketRef = useRef(null);

  // Connect once user has a display name
  useEffect(() => {
    if (!displayName) return;
    let cancelled = false;

    api.getBoard(boardId)
      .then((b) => { if (!cancelled) dispatch({ type: 'set', board: b }); })
      .catch((e) => { if (!cancelled) setError(e.message); });

    // In dev, connect directly to the backend port to bypass Vite's
    // WebSocket proxy (which is flaky with Socket.io's upgrade handshake).
    // In prod the same Node process serves both the client and Socket.io,
    // so an empty URL = same origin.
    const socket = io(import.meta.env.DEV ? 'http://localhost:4000' : undefined);
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_board', { boardId, displayName }, (resp) => {
        if (resp?.error) {
          setError(resp.error);
        } else if (resp?.board) {
          dispatch({ type: 'set', board: resp.board });
        }
      });
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('presence_update', ({ count }) => setPresenceCount(count));

    socket.on('card_added', ({ card }) => {
      dispatch({ type: 'card_added', card });
      pushFeed(`${card.author_name} added a card`);
    });
    socket.on('card_moved', (payload) => {
      dispatch({ type: 'card_moved', ...payload });
    });
    socket.on('comment_added', ({ comment }) => {
      dispatch({ type: 'comment_added', comment });
      pushFeed(`${comment.author_name} commented`);
    });
    socket.on('column_added', ({ column }) => {
      dispatch({ type: 'column_added', column });
      pushFeed(`new column “${column.title}”`);
    });

    return () => {
      cancelled = true;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [boardId, displayName]);

  useEffect(() => {
    if (board) document.title = `${board.title} · Retro Board`;
  }, [board]);

  function pushFeed(text) {
    const id = `${Date.now()}-${Math.random()}`;
    setFeed((prev) => [...prev.slice(-MAX_FEED + 1), { id, text, ts: Date.now() }]);
    setTimeout(() => {
      setFeed((prev) => prev.filter((f) => f.id !== id));
    }, 3200);
  }

  function handleJoin(name) {
    setName(name);
    setNeedsAuth(false);
  }

  function onAddCard(columnId, content) {
    socketRef.current?.emit('add_card', { columnId, content });
  }
  function onAddComment(cardId, content) {
    socketRef.current?.emit('add_comment', { cardId, content });
  }
  function onAddColumn(title, color) {
    socketRef.current?.emit('add_column', { boardId, title, color });
  }

  /* --------- Drag and drop ---------- */
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const activeCard = useMemo(() => {
    if (!activeDrag || !board) return null;
    for (const col of board.columns) {
      const c = col.cards.find((x) => x.id === activeDrag);
      if (c) return c;
    }
    return null;
  }, [activeDrag, board]);

  function handleDragStart(event) {
    setActiveDrag(event.active.id);
  }
  function handleDragEnd(event) {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over || !board) return;

    const fromLoc = findCardLocation(board, active.id);
    if (!fromLoc) return;

    let toColumnId;
    let toIndex;

    const overType = over.data?.current?.type;
    if (overType === 'column') {
      toColumnId = over.id;
      const col = board.columns.find((c) => c.id === toColumnId);
      toIndex = col ? col.cards.length : 0;
      // If dropping over current column with no shift, treat as end-of-list
    } else if (overType === 'card') {
      const overCard = over.data.current.card;
      toColumnId = overCard.column_id;
      const col = board.columns.find((c) => c.id === toColumnId);
      const overIdx = col ? col.cards.findIndex((c) => c.id === overCard.id) : 0;
      // If moving within same column from earlier index to later, account for self-removal
      if (fromLoc.columnId === toColumnId && fromLoc.index < overIdx) {
        toIndex = overIdx;
      } else {
        toIndex = overIdx;
      }
    } else {
      return;
    }

    if (fromLoc.columnId === toColumnId && fromLoc.index === toIndex) return;

    // Optimistic update
    dispatch({
      type: 'card_moved',
      cardId: active.id,
      fromColumnId: fromLoc.columnId,
      toColumnId,
      toIndex,
    });
    // Server is the source of truth; will rebroadcast canonical state
    socketRef.current?.emit('move_card', { cardId: active.id, toColumnId, toIndex });
  }

  if (needsAuth) {
    return <GuestAuthModal onJoin={handleJoin} />;
  }

  if (error) {
    return (
      <main className="app-main">
        <div className="card empty-state">
          <h3>Couldn&apos;t load board</h3>
          <p>{error}</p>
          <p style={{ marginTop: 12 }}>
            <Link to="/" className="btn btn-primary">← Back to boards</Link>
          </p>
        </div>
      </main>
    );
  }

  if (!board) {
    return (
      <main className="app-main">
        <div className="empty-state"><p>Loading board…</p></div>
      </main>
    );
  }

  return (
    <main className="app-main wide" id="board-page">
      <div className="board-toolbar">
        <div className="title-group">
          <span className="breadcrumb"><Link to="/">All boards</Link> / Board</span>
          <h1 id="board-title">{board.title}</h1>
        </div>
        <div className="toolbar-actions">
          <div
            className={`presence-pill ${connected ? '' : 'offline'}`}
            id="presence-pill"
            title={connected ? 'Connected in real-time' : 'Reconnecting…'}
          >
            <span className="dot" />
            <span>{connected ? `${presenceCount} online` : 'Reconnecting…'}</span>
          </div>
          <div className="user-pill" id="board-user-pill">
            <span className="avatar" aria-hidden="true">{initials(displayName)}</span>
            <span>{displayName}</span>
          </div>
          <a
            className="btn btn-warm"
            href={api.exportUrl(board.id)}
            id="export-csv-btn"
            title="Export the entire board to CSV"
          >
            ⬇ Export CSV
          </a>
        </div>
      </div>

      <div className="board-wrap">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveDrag(null)}
        >
          <div className="board" id="board-columns">
            {board.columns.map((col) => (
              <Column
                key={col.id}
                column={col}
                onAddCard={onAddCard}
                onAddComment={onAddComment}
              />
            ))}
            <AddColumnTile onAdd={onAddColumn} />
          </div>

          <DragOverlay>
            {activeCard ? (
              <div className="card-item is-overlay">
                <div className="card-content">{activeCard.content}</div>
                <div className="card-foot">
                  <span className="card-author">
                    <span className="mini-avatar">{initials(activeCard.author_name)}</span>
                    <span>{activeCard.author_name} · {timeAgo(activeCard.created_at)}</span>
                  </span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {feed.length > 0 && (
        <div className="toast-feed" aria-live="polite">
          {feed.map((f) => (
            <div key={f.id} className="item">
              <b>·</b> {f.text}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
