import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { api } from '../lib/api.js';
import { emitWithAck, getSocket } from '../lib/socket.js';
import { getDisplayName, setDisplayName } from '../lib/session.js';
import { useToast } from '../components/Toaster.jsx';
import DisplayNameModal from '../components/DisplayNameModal.jsx';
import Column from '../components/Column.jsx';

// ---------- Reducer keeps board mutations immutable & predictable ----------

const initialState = { status: 'loading', board: null, error: null };

function reducer(state, action) {
  switch (action.type) {
    case 'load_success':
      return { status: 'ready', board: action.board, error: null };
    case 'load_error':
      return { status: 'error', board: null, error: action.error };
    case 'replace_board':
      return { ...state, board: action.board };

    case 'card_added': {
      if (!state.board) return state;
      return {
        ...state,
        board: {
          ...state.board,
          columns: state.board.columns.map((col) => {
            if (col.id !== action.columnId) return col;
            if (col.cards.some((c) => c.id === action.card.id)) return col;
            return {
              ...col,
              cards: [...col.cards, { ...action.card, comments: action.card.comments ?? [] }],
            };
          }),
        },
      };
    }

    case 'card_moved': {
      if (!state.board) return state;
      const {
        cardId, sourceColumnId, destinationColumnId, sourceOrder, destinationOrder,
      } = action;

      // Find the card in any column
      let movedCard = null;
      for (const col of state.board.columns) {
        const found = col.cards.find((c) => c.id === cardId);
        if (found) { movedCard = found; break; }
      }
      if (!movedCard) return state;

      const updatedCard = { ...movedCard, columnId: destinationColumnId };

      const cardLookup = new Map();
      for (const col of state.board.columns) {
        for (const c of col.cards) cardLookup.set(c.id, c);
      }
      cardLookup.set(updatedCard.id, updatedCard);

      const orderToCards = (order) =>
        order.map((id) => cardLookup.get(id)).filter(Boolean);

      return {
        ...state,
        board: {
          ...state.board,
          columns: state.board.columns.map((col) => {
            if (col.id === sourceColumnId && col.id === destinationColumnId) {
              return { ...col, cards: orderToCards(destinationOrder) };
            }
            if (col.id === sourceColumnId) {
              return { ...col, cards: orderToCards(sourceOrder) };
            }
            if (col.id === destinationColumnId) {
              return { ...col, cards: orderToCards(destinationOrder) };
            }
            return col;
          }),
        },
      };
    }

    case 'comment_added': {
      if (!state.board) return state;
      return {
        ...state,
        board: {
          ...state.board,
          columns: state.board.columns.map((col) => ({
            ...col,
            cards: col.cards.map((c) => {
              if (c.id !== action.cardId) return c;
              if ((c.comments || []).some((cm) => cm.id === action.comment.id)) return c;
              return { ...c, comments: [...(c.comments || []), action.comment] };
            }),
          })),
        },
      };
    }

    case 'column_added': {
      if (!state.board) return state;
      if (state.board.columns.some((c) => c.id === action.column.id)) return state;
      return {
        ...state,
        board: {
          ...state.board,
          columns: [...state.board.columns, { ...action.column, cards: action.column.cards || [] }],
        },
      };
    }

    default:
      return state;
  }
}

// ---------- Component ----------

export default function BoardPage() {
  const { id: boardId } = useParams();
  const { toast } = useToast();

  const [state, dispatch] = useReducer(reducer, initialState);
  const [displayName, setDisplayNameState] = useState(getDisplayName());
  const [needsName, setNeedsName] = useState(!getDisplayName());
  const [connected, setConnected] = useState(false);
  const [presenceCount, setPresenceCount] = useState(1);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [columnDraft, setColumnDraft] = useState('');
  const [creatingColumn, setCreatingColumn] = useState(false);

  const joinedRef = useRef(false);

  // Initial fetch
  const refetch = useCallback(() => {
    api.getBoard(boardId)
      .then((board) => dispatch({ type: 'load_success', board }))
      .catch((err) => dispatch({ type: 'load_error', error: err.message }));
  }, [boardId]);

  useEffect(() => { refetch(); }, [refetch]);

  // Socket lifecycle: connect, join, listen, refetch on reconnect
  useEffect(() => {
    if (!displayName || !boardId) return;
    const socket = getSocket();

    function joinRoom() {
      emitWithAck('join_board', { boardId, displayName })
        .then(() => {
          joinedRef.current = true;
          setConnected(true);
        })
        .catch((err) => {
          setConnected(false);
          toast(err.message || 'Failed to join board', { kind: 'error' });
        });
    }

    function onConnect() {
      setConnected(true);
      // Re-join on (re)connect; refetch state to re-sync.
      joinRoom();
      if (joinedRef.current) refetch();
    }
    function onDisconnect() { setConnected(false); }

    function onCardAdded({ columnId, card }) {
      dispatch({ type: 'card_added', columnId, card });
    }
    function onCardMoved(payload) {
      dispatch({ type: 'card_moved', ...payload });
    }
    function onCommentAdded({ cardId, comment }) {
      dispatch({ type: 'comment_added', cardId, comment });
    }
    function onColumnAdded({ column }) {
      dispatch({ type: 'column_added', column });
    }
    function onPresenceJoined({ displayName: who }) {
      setPresenceCount((n) => n + 1);
      toast(`${who} joined`);
    }
    function onPresenceLeft({ displayName: who }) {
      setPresenceCount((n) => Math.max(1, n - 1));
      toast(`${who} left`);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);
    socket.on('column_added', onColumnAdded);
    socket.on('presence_joined', onPresenceJoined);
    socket.on('presence_left', onPresenceLeft);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
      socket.off('column_added', onColumnAdded);
      socket.off('presence_joined', onPresenceJoined);
      socket.off('presence_left', onPresenceLeft);
    };
  }, [boardId, displayName, refetch, toast]);

  // ---------- Mutations ----------

  const handleAddCard = useCallback(async (columnId, content) => {
    try {
      await emitWithAck('add_card', { boardId, columnId, content });
    } catch (err) {
      toast(err.message || 'Failed to add card', { kind: 'error' });
      throw err;
    }
  }, [boardId, toast]);

  const handleAddComment = useCallback(async (cardId, content) => {
    try {
      await emitWithAck('add_comment', { cardId, content });
    } catch (err) {
      toast(err.message || 'Failed to add comment', { kind: 'error' });
      throw err;
    }
  }, [toast]);

  const handleDragEnd = useCallback(async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;

    // Optimistic: compute new orders locally before broadcast lands.
    const board = state.board;
    if (!board) return;

    const sourceColumn = board.columns.find((c) => c.id === source.droppableId);
    const destinationColumn = board.columns.find((c) => c.id === destination.droppableId);
    if (!sourceColumn || !destinationColumn) return;

    const sourceCardIds = sourceColumn.cards.map((c) => c.id);
    const removedSource = sourceCardIds.filter((id) => id !== draggableId);

    let destinationCardIds;
    if (sourceColumn.id === destinationColumn.id) {
      destinationCardIds = removedSource.slice();
      destinationCardIds.splice(destination.index, 0, draggableId);
    } else {
      destinationCardIds = destinationColumn.cards.map((c) => c.id);
      destinationCardIds.splice(destination.index, 0, draggableId);
    }

    dispatch({
      type: 'card_moved',
      cardId: draggableId,
      sourceColumnId: sourceColumn.id,
      destinationColumnId: destinationColumn.id,
      sourceOrder: sourceColumn.id === destinationColumn.id ? destinationCardIds : removedSource,
      destinationOrder: destinationCardIds,
    });

    try {
      await emitWithAck('move_card', {
        cardId: draggableId,
        toColumnId: destination.droppableId,
        toIndex: destination.index,
      });
    } catch (err) {
      toast(err.message || 'Failed to move card', { kind: 'error' });
      // Reconcile by refetching the truth.
      refetch();
    }
  }, [state.board, refetch, toast]);

  const handleAddColumn = useCallback(async (e) => {
    e.preventDefault();
    const trimmed = columnDraft.trim();
    if (!trimmed || creatingColumn) return;
    setCreatingColumn(true);
    try {
      const column = await api.createColumn(boardId, trimmed);
      dispatch({ type: 'column_added', column });
      setColumnDraft('');
      setShowAddColumn(false);
    } catch (err) {
      toast(err.message || 'Failed to add column', { kind: 'error' });
    } finally {
      setCreatingColumn(false);
    }
  }, [boardId, columnDraft, creatingColumn, toast]);

  function handleSubmitName(name) {
    setDisplayName(name);
    setDisplayNameState(name);
    setNeedsName(false);
  }

  function handleChangeName() {
    setNeedsName(true);
  }

  function handleExport() {
    window.open(api.exportUrl(boardId), '_blank', 'noopener');
  }

  // ---------- Derived ----------

  const board = state.board;
  const totalCards = useMemo(() => {
    if (!board) return 0;
    return board.columns.reduce((sum, c) => sum + c.cards.length, 0);
  }, [board]);

  // ---------- Render ----------

  if (state.status === 'loading') {
    return (
      <div className="center-state">
        <div>
          <div className="spinner" aria-hidden="true" />
          <p>Loading board…</p>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="empty-state" role="alert">
        <h3>Couldn't load this board</h3>
        <p>{state.error}</p>
        <p style={{ marginTop: 12 }}>
          <Link to="/" className="btn btn-ghost btn-sm">← Back to all boards</Link>
        </p>
      </div>
    );
  }

  return (
    <>
      {needsName && (
        <DisplayNameModal
          initial={displayName}
          boardTitle={board?.title}
          onSubmit={handleSubmitName}
          onCancel={displayName ? () => setNeedsName(false) : undefined}
        />
      )}

      <div className="board-toolbar">
        <div className="left">
          <Link to="/" className="crumb" id="back-to-boards">
            ← Boards
          </Link>
          <h1 title={board.title}>{board.title}</h1>
        </div>
        <div className="right">
          <span className={`presence${connected ? '' : ' disconnected'}`} title={connected ? 'Live' : 'Reconnecting…'}>
            <span className="dot" />
            {connected ? 'Live' : 'Reconnecting'}
            <span className="muted">·</span>
            {totalCards} card{totalCards === 1 ? '' : 's'}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleChangeName} id="change-display-name">
            {displayName || 'Set name'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleExport} id="export-csv-button" title="Export to CSV">
            ⬇ CSV
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns" id="board-columns">
          {board.columns.map((col, idx) => (
            <Column
              key={col.id}
              column={col}
              index={idx}
              onAddCard={handleAddCard}
              onAddComment={handleAddComment}
            />
          ))}
          {showAddColumn ? (
            <form className="glass add-column-form" onSubmit={handleAddColumn} aria-label="Add a column">
              <label className="label" htmlFor="new-column-input">New column title</label>
              <input
                id="new-column-input"
                className="input"
                autoFocus
                value={columnDraft}
                placeholder="e.g. Kudos"
                maxLength={80}
                onChange={(e) => setColumnDraft(e.target.value)}
              />
              <div className="add-card-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setShowAddColumn(false); setColumnDraft(''); }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={!columnDraft.trim() || creatingColumn}
                  id="new-column-submit"
                >
                  {creatingColumn ? 'Adding…' : 'Add column'}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="add-column-trigger"
              onClick={() => setShowAddColumn(true)}
              id="add-column-trigger"
            >
              + Add column
            </button>
          )}
        </div>
      </DragDropContext>
    </>
  );
}
