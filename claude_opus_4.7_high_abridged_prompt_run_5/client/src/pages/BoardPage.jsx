import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io as ioClient } from 'socket.io-client';
import { DragDropContext } from '@hello-pangea/dnd';
import { api } from '../lib/api.js';
import { getStoredName, saveName } from '../lib/displayName.js';
import { colorFor, initials } from '../lib/format.js';
import NamePromptModal from '../components/NamePromptModal.jsx';
import Column from '../components/Column.jsx';
import CardDetailDrawer from '../components/CardDetailDrawer.jsx';
import AddColumnButton from '../components/AddColumnButton.jsx';

const initialState = { status: 'loading', board: null, error: null };

function reducer(state, action) {
  switch (action.type) {
    case 'loaded':
      return { status: 'ready', board: action.board, error: null };
    case 'error':
      return { ...state, status: 'error', error: action.error };
    case 'card_added': {
      if (!state.board) return state;
      const columns = state.board.columns.map((col) =>
        col.id === action.card.column_id
          ? { ...col, cards: [...col.cards, action.card] }
          : col
      );
      return { ...state, board: { ...state.board, columns } };
    }
    case 'card_moved': {
      if (!state.board) return state;
      const { cardId, fromColumnId, toColumnId, toPosition } = action;
      let movingCard = null;
      const columns = state.board.columns.map((col) => {
        if (col.id !== fromColumnId) return col;
        const filtered = col.cards.filter((c) => {
          if (c.id === cardId) {
            movingCard = c;
            return false;
          }
          return true;
        });
        return { ...col, cards: filtered };
      });
      if (!movingCard) return state;
      const relocated = columns.map((col) => {
        if (col.id !== toColumnId) return col;
        const cards = [...col.cards];
        cards.splice(toPosition, 0, { ...movingCard, column_id: toColumnId });
        return { ...col, cards };
      });
      return { ...state, board: { ...state.board, columns: relocated } };
    }
    case 'comment_added': {
      if (!state.board) return state;
      const columns = state.board.columns.map((col) => ({
        ...col,
        cards: col.cards.map((card) =>
          card.id === action.comment.card_id
            ? { ...card, comments: [...(card.comments || []), action.comment] }
            : card
        ),
      }));
      return { ...state, board: { ...state.board, columns } };
    }
    case 'column_added': {
      if (!state.board) return state;
      const exists = state.board.columns.some(
        (c) => c.id === action.column.id
      );
      if (exists) return state;
      return {
        ...state,
        board: {
          ...state.board,
          columns: [...state.board.columns, { ...action.column, cards: [] }],
        },
      };
    }
    default:
      return state;
  }
}

export default function BoardPage() {
  const { boardId } = useParams();
  const [displayName, setDisplayName] = useState(getStoredName());
  const [state, dispatch] = useReducer(reducer, initialState);
  const [openCardId, setOpenCardId] = useState(null);
  const [presence, setPresence] = useState({ recent: null });
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  const refetch = useCallback(() => {
    api
      .getBoard(boardId)
      .then((board) => dispatch({ type: 'loaded', board }))
      .catch((e) => dispatch({ type: 'error', error: e.message }));
  }, [boardId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!displayName) return;

    const socket = ioClient({
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit(
        'join_board',
        { boardId, displayName },
        (res) => {
          if (res?.error) {
            dispatch({ type: 'error', error: res.error });
          } else {
            refetch();
          }
        }
      );
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('reconnect', () => refetch());

    socket.on('card_added', ({ card }) =>
      dispatch({ type: 'card_added', card })
    );
    socket.on('card_moved', (payload) =>
      dispatch({ type: 'card_moved', ...payload })
    );
    socket.on('comment_added', ({ comment }) =>
      dispatch({ type: 'comment_added', comment })
    );
    socket.on('column_added', ({ column }) =>
      dispatch({ type: 'column_added', column })
    );
    socket.on('presence_joined', ({ name }) => {
      setPresence({ recent: { name, kind: 'joined', at: Date.now() } });
    });
    socket.on('presence_left', ({ name }) => {
      setPresence({ recent: { name, kind: 'left', at: Date.now() } });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [displayName, boardId, refetch]);

  const openCard = useMemo(() => {
    if (!openCardId || !state.board) return null;
    for (const col of state.board.columns) {
      const found = col.cards.find((c) => c.id === openCardId);
      if (found) return found;
    }
    return null;
  }, [openCardId, state.board]);

  function handleName(name) {
    saveName(name);
    setDisplayName(name);
  }

  function addCard(columnId, content) {
    socketRef.current?.emit('add_card', { columnId, content });
  }

  function addComment(cardId, content) {
    socketRef.current?.emit('add_comment', { cardId, content });
  }

  async function createColumn(title, color) {
    try {
      await api.createColumn(boardId, title, color);
    } catch (e) {
      alert(e.message);
    }
  }

  function onDragEnd(result) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    dispatch({
      type: 'card_moved',
      cardId: draggableId,
      fromColumnId: source.droppableId,
      toColumnId: destination.droppableId,
      toPosition: destination.index,
    });

    socketRef.current?.emit(
      'move_card',
      {
        cardId: draggableId,
        toColumnId: destination.droppableId,
        toPosition: destination.index,
      },
      (ack) => {
        if (ack?.error) refetch();
      }
    );
  }

  if (!displayName) {
    return <NamePromptModal onSubmit={handleName} />;
  }

  if (state.status === 'loading') {
    return (
      <div className="board-loading">
        <div className="spinner" aria-hidden="true" />
        <p>Loading board…</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="board-error">
        <h2>Something went wrong</h2>
        <p>{state.error}</p>
      </div>
    );
  }

  const board = state.board;
  const [nf, nt] = colorFor(displayName);

  return (
    <div className="board-page">
      <div className="board-head">
        <div>
          <div className="board-eyebrow">Retro board</div>
          <h1 className="board-title">{board.title}</h1>
        </div>
        <div className="board-actions">
          <div className={'presence ' + (connected ? 'is-online' : 'is-offline')}>
            <span className="presence-dot" />
            <span>{connected ? 'Live' : 'Reconnecting…'}</span>
          </div>
          <div className="you-chip">
            <span
              className="avatar avatar-sm"
              style={{
                background: `linear-gradient(135deg, ${nf}, ${nt})`,
              }}
            >
              {initials(displayName)}
            </span>
            <span>{displayName}</span>
          </div>
          <a
            href={api.exportUrl(boardId)}
            className="btn btn-ghost btn-sm"
            download
          >
            <ExportIcon /> Export CSV
          </a>
        </div>
      </div>

      {presence.recent && (
        <PresenceToast
          key={presence.recent.at}
          name={presence.recent.name}
          kind={presence.recent.kind}
        />
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="columns-strip">
          {board.columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              onAddCard={addCard}
              onOpenCard={(card) => setOpenCardId(card.id)}
            />
          ))}
          <div className="column column-ghost">
            <AddColumnButton onCreate={createColumn} />
          </div>
        </div>
      </DragDropContext>

      {openCard && (
        <CardDetailDrawer
          card={openCard}
          onClose={() => setOpenCardId(null)}
          onAddComment={addComment}
        />
      )}
    </div>
  );
}

function ExportIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PresenceToast({ name, kind }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div className="presence-toast">
      <strong>{name}</strong> {kind === 'joined' ? 'joined the board' : 'left'}
    </div>
  );
}
