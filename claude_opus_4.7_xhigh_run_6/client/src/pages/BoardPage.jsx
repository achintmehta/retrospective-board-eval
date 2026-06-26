import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api } from '../api.js';
import { getSocket, emitWithAck } from '../socket.js';
import { getDisplayName, setDisplayName } from '../session.js';
import GuestNameModal from '../components/GuestNameModal.jsx';
import Card from '../components/Card.jsx';
import AddCardForm from '../components/AddCardForm.jsx';
import AddColumnForm from '../components/AddColumnForm.jsx';

const initialState = { status: 'loading', board: null, error: null };

function reducer(state, action) {
  switch (action.type) {
    case 'loaded':
      return { status: 'ready', board: action.board, error: null };
    case 'load_failed':
      return { status: 'error', board: null, error: action.error };
    case 'column_added': {
      if (!state.board || action.column.board_id !== state.board.id) return state;
      if (state.board.columns.some((c) => c.id === action.column.id)) return state;
      return {
        ...state,
        board: {
          ...state.board,
          columns: [...state.board.columns, { ...action.column, cards: [] }],
        },
      };
    }
    case 'card_added': {
      if (!state.board) return state;
      const { card } = action;
      if (state.board.columns.every((c) => c.id !== card.column_id)) return state;
      return {
        ...state,
        board: {
          ...state.board,
          columns: state.board.columns.map((col) => {
            if (col.id !== card.column_id) return col;
            if (col.cards.some((c) => c.id === card.id)) return col;
            return { ...col, cards: [...col.cards, { ...card, comments: card.comments || [] }] };
          }),
        },
      };
    }
    case 'card_moved': {
      if (!state.board) return state;
      const { card_id, from_column_id, to_column_id, to_index } = action;
      let movedCard = null;
      const columnsWithout = state.board.columns.map((col) => {
        if (col.id !== from_column_id) return col;
        const idx = col.cards.findIndex((c) => c.id === card_id);
        if (idx === -1) return col;
        movedCard = col.cards[idx];
        const newCards = col.cards.slice();
        newCards.splice(idx, 1);
        return { ...col, cards: newCards };
      });
      if (!movedCard) {
        for (const col of state.board.columns) {
          const existing = col.cards.find((c) => c.id === card_id);
          if (existing) {
            movedCard = existing;
            break;
          }
        }
      }
      if (!movedCard) return state;
      const updatedColumns = columnsWithout.map((col) => {
        if (col.id !== to_column_id) return col;
        const newCards = col.cards.filter((c) => c.id !== card_id);
        const insertAt = Math.max(0, Math.min(to_index, newCards.length));
        const updatedCard = { ...movedCard, column_id: to_column_id };
        newCards.splice(insertAt, 0, updatedCard);
        return { ...col, cards: newCards };
      });
      return { ...state, board: { ...state.board, columns: updatedColumns } };
    }
    case 'comment_added': {
      if (!state.board) return state;
      const { card_id, comment } = action;
      return {
        ...state,
        board: {
          ...state.board,
          columns: state.board.columns.map((col) => ({
            ...col,
            cards: col.cards.map((card) => {
              if (card.id !== card_id) return card;
              if ((card.comments || []).some((c) => c.id === comment.id)) return card;
              return { ...card, comments: [...(card.comments || []), comment] };
            }),
          })),
        },
      };
    }
    case 'replace_board':
      return { ...state, board: action.board };
    default:
      return state;
  }
}

export default function BoardPage() {
  const { boardId } = useParams();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [displayName, setDisplayNameState] = useState(() => getDisplayName());
  const [exportError, setExportError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const joinedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const board = await api.getBoard(boardId);
      dispatch({ type: 'loaded', board });
    } catch (err) {
      dispatch({ type: 'load_failed', error: err.message });
    }
  }, [boardId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!boardId) return;
    const socket = getSocket();

    const onCardAdded = (payload) => {
      if (payload.board_id !== boardId) return;
      dispatch({ type: 'card_added', card: payload.card });
    };
    const onCardMoved = (payload) => {
      if (payload.board_id !== boardId) return;
      dispatch({ type: 'card_moved', ...payload });
    };
    const onCommentAdded = (payload) => {
      if (payload.board_id !== boardId) return;
      dispatch({ type: 'comment_added', card_id: payload.card_id, comment: payload.comment });
    };

    const joinBoard = () => {
      socket.emit('join_board', boardId, (resp) => {
        if (resp?.ok) {
          joinedRef.current = true;
          if (state.board) refresh();
        }
      });
    };

    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);
    socket.on('connect', joinBoard);
    if (socket.connected) joinBoard();

    return () => {
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
      socket.off('connect', joinBoard);
      socket.emit('leave_board', boardId);
      joinedRef.current = false;
    };
  }, [boardId, refresh]);

  const handleDisplayName = useCallback((name) => {
    setDisplayName(name);
    setDisplayNameState(name);
  }, []);

  const handleDragEnd = useCallback(
    async (result) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (destination.droppableId === source.droppableId && destination.index === source.index) {
        return;
      }
      dispatch({
        type: 'card_moved',
        card_id: draggableId,
        from_column_id: source.droppableId,
        to_column_id: destination.droppableId,
        to_index: destination.index,
      });
      const resp = await emitWithAck('move_card', {
        cardId: draggableId,
        toColumnId: destination.droppableId,
        toIndex: destination.index,
      });
      if (!resp?.ok) {
        setActionError(resp?.error || 'Failed to move card');
        refresh();
      }
    },
    [refresh]
  );

  const handleAddCard = useCallback(
    async (columnId, content) => {
      const resp = await emitWithAck('add_card', {
        columnId,
        content,
        authorName: displayName,
      });
      if (!resp?.ok) {
        setActionError(resp?.error || 'Failed to add card');
        return false;
      }
      return true;
    },
    [displayName]
  );

  const handleAddComment = useCallback(
    async (cardId, content) => {
      const resp = await emitWithAck('add_comment', {
        cardId,
        content,
        authorName: displayName,
      });
      if (!resp?.ok) {
        setActionError(resp?.error || 'Failed to add comment');
        return false;
      }
      return true;
    },
    [displayName]
  );

  const handleAddColumn = useCallback(
    async (title) => {
      try {
        const column = await api.createColumn(boardId, title);
        dispatch({ type: 'column_added', column });
        return true;
      } catch (err) {
        setActionError(err.message);
        return false;
      }
    },
    [boardId]
  );

  const handleExport = useCallback(() => {
    setExportError(null);
    window.location.href = api.exportUrl(boardId);
  }, [boardId]);

  const board = state.board;
  const columns = useMemo(() => board?.columns || [], [board]);

  if (state.status === 'loading') {
    return <p className="muted">Loading board…</p>;
  }
  if (state.status === 'error') {
    return (
      <div className="card-panel">
        <p className="error-text">Failed to load board: {state.error}</p>
        <Link to="/">Back to boards</Link>
      </div>
    );
  }
  if (!board) return null;

  if (!displayName) {
    return <GuestNameModal onSubmit={handleDisplayName} />;
  }

  return (
    <div className="board-page">
      <header className="board-header">
        <div>
          <h1 className="board-title">{board.title}</h1>
          <p className="muted">
            Signed in as <strong>{displayName}</strong>
          </p>
        </div>
        <div className="board-actions">
          <button type="button" onClick={handleExport}>Export CSV</button>
        </div>
      </header>

      {actionError && (
        <div className="banner banner-error" onClick={() => setActionError(null)}>
          {actionError} <span className="muted">(click to dismiss)</span>
        </div>
      )}
      {exportError && <p className="error-text">{exportError}</p>}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board-columns">
          {columns.map((column) => (
            <Droppable droppableId={column.id} key={column.id}>
              {(provided, snapshot) => (
                <section
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`board-column ${snapshot.isDraggingOver ? 'is-drag-over' : ''}`}
                >
                  <h3 className="column-title">{column.title}</h3>
                  <div className="column-cards">
                    {column.cards.map((card, index) => (
                      <Draggable draggableId={card.id} index={index} key={card.id}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={`card-wrap ${dragSnapshot.isDragging ? 'is-dragging' : ''}`}
                          >
                            <Card card={card} onAddComment={handleAddComment} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                  <AddCardForm
                    onSubmit={(content) => handleAddCard(column.id, content)}
                  />
                </section>
              )}
            </Droppable>
          ))}
          <div className="board-column board-column-add">
            <AddColumnForm onSubmit={handleAddColumn} />
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
