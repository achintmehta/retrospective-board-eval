import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { api } from '../api.js';
import { useGuestName } from '../hooks/useGuestName.js';
import { useBoardSocket } from '../hooks/useBoardSocket.js';
import GuestNameModal from '../components/GuestNameModal.jsx';
import Column from '../components/Column.jsx';
import CardDetailModal from '../components/CardDetailModal.jsx';
import AddColumnButton from '../components/AddColumnButton.jsx';
import ParticipantsBadge from '../components/ParticipantsBadge.jsx';
import ConnectionStatus from '../components/ConnectionStatus.jsx';

// --- Reducer for board state ---

function boardReducer(state, action) {
  switch (action.type) {
    case 'set':
      return action.board;
    case 'card_added': {
      if (!state) return state;
      // Dedupe in case the originator already inserted optimistically
      if (state.cards.some((c) => c.id === action.payload.id)) return state;
      return { ...state, cards: [...state.cards, action.payload] };
    }
    case 'card_moved': {
      if (!state) return state;
      const { card, columnOrders } = action.payload;
      const nextCards = state.cards.map((c) => {
        if (c.id === card.id) {
          return { ...c, column_id: card.column_id, position: card.position };
        }
        return c;
      });

      // Apply position updates from the affected columns
      for (const [colId, ordered] of Object.entries(columnOrders || {})) {
        const positionById = new Map(ordered.map((row) => [row.id, row.position]));
        for (let i = 0; i < nextCards.length; i += 1) {
          if (nextCards[i].column_id === colId && positionById.has(nextCards[i].id)) {
            nextCards[i] = { ...nextCards[i], position: positionById.get(nextCards[i].id) };
          }
        }
      }

      return { ...state, cards: nextCards };
    }
    case 'comment_added': {
      if (!state) return state;
      if (state.comments.some((c) => c.id === action.payload.id)) return state;
      return { ...state, comments: [...state.comments, action.payload] };
    }
    case 'column_added': {
      if (!state) return state;
      if (state.columns.some((c) => c.id === action.payload.id)) return state;
      return {
        ...state,
        columns: [...state.columns, action.payload].sort((a, b) => a.position - b.position),
      };
    }
    default:
      return state;
  }
}

const COLUMN_ACCENTS = [
  { color: 'hsl(160 84% 55%)', gradient: 'linear-gradient(135deg, hsl(160 84% 50%), hsl(189 94% 55%))' },
  { color: 'hsl(20 96% 62%)', gradient: 'linear-gradient(135deg, hsl(330 81% 60%), hsl(20 96% 62%))' },
  { color: 'hsl(258 90% 70%)', gradient: 'linear-gradient(135deg, hsl(258 90% 66%), hsl(220 100% 70%))' },
  { color: 'hsl(48 96% 60%)', gradient: 'linear-gradient(135deg, hsl(48 96% 60%), hsl(20 96% 62%))' },
  { color: 'hsl(189 94% 55%)', gradient: 'linear-gradient(135deg, hsl(189 94% 55%), hsl(220 100% 70%))' },
  { color: 'hsl(330 81% 60%)', gradient: 'linear-gradient(135deg, hsl(330 81% 60%), hsl(258 90% 66%))' },
];

export default function BoardPage() {
  const { boardId } = useParams();
  const [board, dispatch] = useReducer(boardReducer, null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeCardId, setActiveCardId] = useState(null);
  const [actionError, setActionError] = useState('');
  const { name, setName } = useGuestName();

  // Initial fetch
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    api
      .getBoard(boardId)
      .then((data) => {
        if (active) {
          dispatch({ type: 'set', board: data });
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setLoadError(err.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [boardId]);

  // Wire socket events to the reducer
  const handleEvent = useCallback((type, payload) => {
    dispatch({ type, payload });
  }, []);

  const { status, participants, addCard, moveCard, addComment } = useBoardSocket({
    boardId,
    displayName: name,
    onEvent: handleEvent,
  });

  // Refetch on reconnect to recover any state the client missed
  useEffect(() => {
    if (status !== 'connected' || !board) return;
    api.getBoard(boardId).then((data) => dispatch({ type: 'set', board: data })).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const columnsWithCards = useMemo(() => {
    if (!board) return [];
    return board.columns
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((col, idx) => ({
        ...col,
        accent: COLUMN_ACCENTS[idx % COLUMN_ACCENTS.length],
        cards: board.cards
          .filter((c) => c.column_id === col.id)
          .sort((a, b) => a.position - b.position),
      }));
  }, [board]);

  const commentsByCard = useMemo(() => {
    const map = new Map();
    if (!board) return map;
    for (const comment of board.comments) {
      if (!map.has(comment.card_id)) map.set(comment.card_id, []);
      map.get(comment.card_id).push(comment);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.created_at - b.created_at);
    }
    return map;
  }, [board]);

  const activeCard = useMemo(() => {
    if (!activeCardId || !board) return null;
    return board.cards.find((c) => c.id === activeCardId) || null;
  }, [activeCardId, board]);

  // --- Handlers ---

  async function onAddCard(columnId, content) {
    setActionError('');
    try {
      await addCard(columnId, content);
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function onDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Optimistic local move: update the reducer immediately
    const optimisticOrders = computeOptimisticOrders(
      columnsWithCards,
      source,
      destination,
      draggableId
    );
    dispatch({
      type: 'card_moved',
      payload: {
        card: {
          id: draggableId,
          column_id: destination.droppableId,
          position: destination.index,
        },
        columnOrders: optimisticOrders,
      },
    });

    try {
      await moveCard(draggableId, destination.droppableId, destination.index);
    } catch (err) {
      setActionError(err.message);
      // Refresh from server on failure
      try {
        const fresh = await api.getBoard(boardId);
        dispatch({ type: 'set', board: fresh });
      } catch {
        /* ignore */
      }
    }
  }

  async function onAddComment(cardId, content) {
    setActionError('');
    try {
      await addComment(cardId, content);
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function onAddColumn(title) {
    setActionError('');
    try {
      await api.createColumn(boardId, title);
      // Server broadcasts column_added; reducer will pick it up.
      // Also refresh in case the socket missed it.
      const fresh = await api.getBoard(boardId);
      dispatch({ type: 'set', board: fresh });
    } catch (err) {
      setActionError(err.message);
    }
  }

  function onExport() {
    window.location.assign(api.exportUrl(boardId));
  }

  // --- Render states ---

  if (loading) {
    return (
      <div className="board-page board-page--loading">
        <div className="loader" aria-hidden="true">
          <span /> <span /> <span />
        </div>
        <p>Loading board…</p>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="board-page board-page--error">
        <h2>Couldn't load the board</h2>
        <p>{loadError}</p>
        <Link to="/" className="btn btn-primary">
          ← Back to boards
        </Link>
      </div>
    );
  }
  if (!board) return null;

  return (
    <div className="board-page">
      {!name && (
        <GuestNameModal
          onSubmit={(value) => setName(value)}
          boardTitle={board.title}
        />
      )}

      <header className="board-header">
        <div className="board-header-left">
          <h1 className="board-title">{board.title}</h1>
          <div className="board-meta">
            <ConnectionStatus status={status} />
            <ParticipantsBadge participants={participants} self={name} />
          </div>
        </div>
        <div className="board-header-right">
          <button
            type="button"
            className="btn btn-ghost"
            id="export-csv-btn"
            onClick={onExport}
            title="Download this board as a CSV file"
          >
            <span aria-hidden="true">⇩</span> Export CSV
          </button>
        </div>
      </header>

      {actionError && (
        <div className="alert alert-error" role="alert" id="board-action-error">
          {actionError}
          <button
            type="button"
            className="alert-dismiss"
            onClick={() => setActionError('')}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="board-columns" id="board-columns">
          {columnsWithCards.map((col) => (
            <Column
              key={col.id}
              column={col}
              cards={col.cards}
              accent={col.accent}
              commentsByCard={commentsByCard}
              onAddCard={(content) => onAddCard(col.id, content)}
              onOpenCard={(cardId) => setActiveCardId(cardId)}
              disabled={!name}
            />
          ))}
          <AddColumnButton onAdd={onAddColumn} disabled={!name} />
        </div>
      </DragDropContext>

      {activeCard && (
        <CardDetailModal
          card={activeCard}
          comments={commentsByCard.get(activeCard.id) || []}
          column={board.columns.find((c) => c.id === activeCard.column_id)}
          onClose={() => setActiveCardId(null)}
          onAddComment={(content) => onAddComment(activeCard.id, content)}
          currentUser={name}
        />
      )}
    </div>
  );
}

/**
 * Pre-compute the new card ordering for both source and destination columns
 * so we can update local state optimistically before the server confirms.
 */
function computeOptimisticOrders(columns, source, destination, draggableId) {
  const orders = {};
  const srcCol = columns.find((c) => c.id === source.droppableId);
  const destCol = columns.find((c) => c.id === destination.droppableId);
  if (!srcCol || !destCol) return orders;

  if (source.droppableId === destination.droppableId) {
    const ids = srcCol.cards.map((c) => c.id);
    const [moved] = ids.splice(source.index, 1);
    ids.splice(destination.index, 0, moved);
    orders[srcCol.id] = ids.map((id, i) => ({ id, position: i }));
  } else {
    const srcIds = srcCol.cards.map((c) => c.id).filter((id) => id !== draggableId);
    const destIds = destCol.cards.map((c) => c.id);
    destIds.splice(destination.index, 0, draggableId);
    orders[srcCol.id] = srcIds.map((id, i) => ({ id, position: i }));
    orders[destCol.id] = destIds.map((id, i) => ({ id, position: i }));
  }
  return orders;
}
