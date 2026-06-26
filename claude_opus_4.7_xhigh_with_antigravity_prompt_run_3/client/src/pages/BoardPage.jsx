import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { api } from '../api.js';
import { getSocket, disconnectSocket } from '../socket.js';
import { getDisplayName, initialsOf } from '../session.js';
import NameModal from '../components/NameModal.jsx';
import CardModal from '../components/CardModal.jsx';
import Column from '../components/Column.jsx';

// ---------------------------------------------------------------
// Reducer — holds the live board state and applies socket events.
// Cards are stored grouped by column for cheap O(1) access; the
// reducer keeps card order in sync with server-assigned positions.
// ---------------------------------------------------------------
function emptyState() {
  return {
    board: null,
    columns: [],
    cardsByColumn: {},
    commentsByCard: {},
  };
}

function sortByPosition(a, b) {
  if (a.position === b.position) return a.id - b.id;
  return a.position - b.position;
}

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE': {
      const { board, columns, cards, comments } = action.payload;
      const cardsByColumn = {};
      for (const col of columns) cardsByColumn[col.id] = [];
      for (const card of cards) {
        if (!cardsByColumn[card.column_id]) cardsByColumn[card.column_id] = [];
        cardsByColumn[card.column_id].push(card);
      }
      for (const colId of Object.keys(cardsByColumn)) cardsByColumn[colId].sort(sortByPosition);
      const commentsByCard = {};
      for (const c of comments) {
        if (!commentsByCard[c.card_id]) commentsByCard[c.card_id] = [];
        commentsByCard[c.card_id].push(c);
      }
      return { board, columns: [...columns].sort(sortByPosition), cardsByColumn, commentsByCard };
    }
    case 'COLUMN_ADDED': {
      const col = action.payload;
      if (state.columns.some((c) => c.id === col.id)) return state;
      const columns = [...state.columns, col].sort(sortByPosition);
      return { ...state, columns, cardsByColumn: { ...state.cardsByColumn, [col.id]: state.cardsByColumn[col.id] || [] } };
    }
    case 'CARD_ADDED': {
      const card = action.payload;
      const list = state.cardsByColumn[card.column_id] || [];
      if (list.some((c) => c.id === card.id)) return state;
      const next = [...list, card].sort(sortByPosition);
      return { ...state, cardsByColumn: { ...state.cardsByColumn, [card.column_id]: next } };
    }
    case 'CARD_MOVED': {
      const { card_id, from_column_id, to_column_id, ordered_cards } = action.payload;
      const fromList = (state.cardsByColumn[from_column_id] || []).filter((c) => c.id !== card_id);
      const movedCard = (state.cardsByColumn[from_column_id] || []).find((c) => c.id === card_id)
        || (state.cardsByColumn[to_column_id] || []).find((c) => c.id === card_id);
      const positions = new Map(ordered_cards.map((c) => [c.id, c.position]));
      let toListSource;
      if (from_column_id === to_column_id) {
        toListSource = fromList.concat(movedCard ? [{ ...movedCard, column_id: to_column_id, position: positions.get(card_id) ?? 0 }] : []);
      } else {
        toListSource = (state.cardsByColumn[to_column_id] || []).filter((c) => c.id !== card_id);
        if (movedCard) {
          toListSource = [...toListSource, { ...movedCard, column_id: to_column_id, position: positions.get(card_id) ?? 0 }];
        }
      }
      // Apply authoritative positions from server
      const reordered = toListSource.map((c) => positions.has(c.id) ? { ...c, position: positions.get(c.id), column_id: to_column_id } : c)
        .sort(sortByPosition);
      const cardsByColumn = { ...state.cardsByColumn, [to_column_id]: reordered };
      if (from_column_id !== to_column_id) cardsByColumn[from_column_id] = fromList;
      return { ...state, cardsByColumn };
    }
    case 'COMMENT_ADDED': {
      const c = action.payload;
      const list = state.commentsByCard[c.card_id] || [];
      if (list.some((x) => x.id === c.id)) return state;
      return { ...state, commentsByCard: { ...state.commentsByCard, [c.card_id]: [...list, c] } };
    }
    case 'OPTIMISTIC_MOVE': {
      // Apply user-initiated reordering immediately before server confirms.
      const { source, destination, draggableId } = action.payload;
      const cardId = Number(draggableId);
      const fromColId = Number(source.droppableId);
      const toColId = Number(destination.droppableId);
      const sourceList = [...(state.cardsByColumn[fromColId] || [])];
      const idx = sourceList.findIndex((c) => c.id === cardId);
      if (idx === -1) return state;
      const [moved] = sourceList.splice(idx, 1);
      const updatedMoved = { ...moved, column_id: toColId };
      let cardsByColumn;
      if (fromColId === toColId) {
        sourceList.splice(destination.index, 0, updatedMoved);
        cardsByColumn = { ...state.cardsByColumn, [toColId]: sourceList.map((c, i) => ({ ...c, position: i })) };
      } else {
        const destList = [...(state.cardsByColumn[toColId] || [])];
        destList.splice(destination.index, 0, updatedMoved);
        cardsByColumn = {
          ...state.cardsByColumn,
          [fromColId]: sourceList.map((c, i) => ({ ...c, position: i })),
          [toColId]: destList.map((c, i) => ({ ...c, position: i })),
        };
      }
      return { ...state, cardsByColumn };
    }
    default:
      return state;
  }
}

export default function BoardPage() {
  const { boardId } = useParams();
  const [state, dispatch] = useReducer(reducer, undefined, emptyState);
  const [displayName, setName] = useState(() => getDisplayName());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openCardId, setOpenCardId] = useState(null);
  const [connected, setConnected] = useState(false);
  const [showColumnForm, setShowColumnForm] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [toast, setToast] = useState(null);
  const socketRef = useRef(null);

  const showToast = useCallback((message) => {
    setToast(message);
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, []);

  // Initial hydration via REST
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.getBoard(boardId)
      .then((payload) => {
        if (cancelled) return;
        dispatch({ type: 'HYDRATE', payload });
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [boardId]);

  // Socket lifecycle — only connect once we have a display name.
  useEffect(() => {
    if (!displayName) return undefined;
    const socket = getSocket();
    socketRef.current = socket;
    if (!socket.connected) socket.connect();

    function handleConnect() {
      setConnected(true);
      socket.emit('join_board', { board_id: boardId, display_name: displayName });
      // After reconnect, refetch the board to avoid drift.
      api.getBoard(boardId).then((payload) => dispatch({ type: 'HYDRATE', payload })).catch(() => {});
    }
    function handleDisconnect() { setConnected(false); }
    function handleColumnAdded(payload) { dispatch({ type: 'COLUMN_ADDED', payload }); }
    function handleCardAdded(payload) { dispatch({ type: 'CARD_ADDED', payload }); }
    function handleCardMoved(payload) { dispatch({ type: 'CARD_MOVED', payload }); }
    function handleCommentAdded(payload) { dispatch({ type: 'COMMENT_ADDED', payload }); }
    function handleError(err) {
      const msg = err && err.message ? err.message : 'Realtime error';
      showToast(msg);
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('column_added', handleColumnAdded);
    socket.on('card_added', handleCardAdded);
    socket.on('card_moved', handleCardMoved);
    socket.on('comment_added', handleCommentAdded);
    socket.on('error_message', handleError);

    if (socket.connected) handleConnect();

    return () => {
      socket.emit('leave_board', { board_id: boardId });
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('column_added', handleColumnAdded);
      socket.off('card_added', handleCardAdded);
      socket.off('card_moved', handleCardMoved);
      socket.off('comment_added', handleCommentAdded);
      socket.off('error_message', handleError);
    };
  }, [boardId, displayName, showToast]);

  useEffect(() => () => disconnectSocket(), []);

  const totalCards = useMemo(
    () => Object.values(state.cardsByColumn).reduce((acc, list) => acc + list.length, 0),
    [state.cardsByColumn],
  );
  const totalComments = useMemo(
    () => Object.values(state.commentsByCard).reduce((acc, list) => acc + list.length, 0),
    [state.commentsByCard],
  );
  const commentCounts = useMemo(() => {
    const out = {};
    for (const [cardId, list] of Object.entries(state.commentsByCard)) out[cardId] = list.length;
    return out;
  }, [state.commentsByCard]);

  const openCardData = useMemo(() => {
    if (openCardId == null) return null;
    for (const col of state.columns) {
      const found = (state.cardsByColumn[col.id] || []).find((c) => c.id === openCardId);
      if (found) return { card: found, column: col };
    }
    return null;
  }, [openCardId, state.columns, state.cardsByColumn]);

  // ---- Actions ----
  const handleAddCard = useCallback(async (columnId, content) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('add_card', { board_id: boardId, column_id: columnId, content, author_name: displayName });
  }, [boardId, displayName]);

  const handleAddComment = useCallback(async (cardId, content) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('add_comment', { board_id: boardId, card_id: cardId, content, author_name: displayName });
  }, [boardId, displayName]);

  const handleAddColumn = useCallback(async (event) => {
    event.preventDefault();
    const trimmed = newColumnTitle.trim();
    if (!trimmed) return;
    try {
      await api.createColumn(boardId, { title: trimmed });
      setNewColumnTitle('');
      setShowColumnForm(false);
    } catch (err) {
      showToast(err.message);
    }
  }, [boardId, newColumnTitle, showToast]);

  const handleDragEnd = useCallback((result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    dispatch({ type: 'OPTIMISTIC_MOVE', payload: result });
    socketRef.current?.emit('move_card', {
      board_id: boardId,
      card_id: Number(draggableId),
      from_column_id: Number(source.droppableId),
      to_column_id: Number(destination.droppableId),
      to_position: destination.index,
    });
  }, [boardId]);

  const handleExport = useCallback(() => {
    window.location.href = api.exportCsvUrl(boardId);
  }, [boardId]);

  // ---- Render ----
  if (!displayName) {
    return <NameModal onSubmit={(name) => setName(name)} />;
  }

  if (loading) {
    return (
      <div className="board-page">
        <div className="board-header">
          <div className="board-header-info">
            <div className="skeleton" style={{ height: 20, width: 80 }} />
            <div className="skeleton" style={{ height: 36, width: 320, marginTop: 8 }} />
          </div>
        </div>
        <div className="columns">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="column" style={{ '--col-accent': 'var(--col-neutral)' }}>
              <div className="column-head"><div className="skeleton" style={{ height: 18, width: 140 }} /></div>
              <div className="column-list">
                {Array.from({ length: 2 }).map((__, j) => (
                  <div key={j} className="skeleton skeleton-card" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <h2>Couldn&rsquo;t load this board</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="board-page">
      <header className="board-header">
        <div className="board-header-info">
          <span className="board-eyebrow">
            <span className="dot-mini" /> Retrospective
          </span>
          <h1 className="board-title" id="board-title">{state.board?.title}</h1>
          <div className="board-stats">
            <span className="stat-chip"><strong>{state.columns.length}</strong> columns</span>
            <span className="stat-chip"><strong>{totalCards}</strong> cards</span>
            <span className="stat-chip"><strong>{totalComments}</strong> comments</span>
          </div>
        </div>
        <div className="board-actions">
          <span className="user-chip">
            <span className="avatar" aria-hidden="true">{initialsOf(displayName)}</span>
            <span>{displayName}</span>
          </span>
          <span className={`connection-pill ${connected ? 'is-connected' : 'is-disconnected'}`}>
            <span className="dot" />
            {connected ? 'Live' : 'Reconnecting…'}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleExport} id="export-csv-button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            Export CSV
          </button>
        </div>
      </header>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns" id="board-columns">
          {state.columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              cards={state.cardsByColumn[col.id] || []}
              commentCounts={commentCounts}
              onAddCard={handleAddCard}
              onOpenCard={(card) => setOpenCardId(card.id)}
            />
          ))}
          {showColumnForm ? (
            <form className="column-new" onSubmit={handleAddColumn} id="add-column-form">
              <div className="column-new-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                New column
              </div>
              <input
                autoFocus
                className="input"
                placeholder="Column title"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                maxLength={60}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 'auto' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowColumnForm(false); setNewColumnTitle(''); }} id="add-column-cancel">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={!newColumnTitle.trim()} id="add-column-submit">Add column</button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="column-new"
              style={{ cursor: 'pointer', textAlign: 'left' }}
              onClick={() => setShowColumnForm(true)}
              id="add-column-toggle"
            >
              <div className="column-new-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                Add column
              </div>
              <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.4 }}>
                Customize this board with your own retrospective categories.
              </p>
            </button>
          )}
        </div>
      </DragDropContext>

      {openCardData && (
        <CardModal
          card={openCardData.card}
          columnTitle={openCardData.column.title}
          comments={state.commentsByCard[openCardData.card.id] || []}
          onAddComment={(content) => handleAddComment(openCardData.card.id, content)}
          onClose={() => setOpenCardId(null)}
        />
      )}

      {toast && (
        <div className="toast-host" aria-live="polite">
          <div className="toast">{toast}</div>
        </div>
      )}

      <style>{`
        .dot-mini { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--brand-2); box-shadow: 0 0 10px var(--brand-2); }
      `}</style>
    </div>
  );
}
