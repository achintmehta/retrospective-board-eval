import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { emitAck, getSocket } from '../socket.js';

const initialState = {
  status: 'idle',
  board: null,
  error: null,
  presence: 0,
};

function boardReducer(state, action) {
  switch (action.type) {
    case 'set_status':
      return { ...state, status: action.status };
    case 'set_error':
      return { ...state, status: 'error', error: action.error };
    case 'set_board':
      return { ...state, status: 'ready', error: null, board: action.board };
    case 'set_presence':
      return { ...state, presence: action.count };
    case 'card_added': {
      if (!state.board) return state;
      const columns = state.board.columns.map((col) => {
        if (col.id !== action.card.column_id) return col;
        if (col.cards.some((c) => c.id === action.card.id)) return col;
        return {
          ...col,
          cards: [...col.cards, { ...action.card, comments: [] }].sort(
            (a, b) => a.position - b.position
          ),
        };
      });
      return { ...state, board: { ...state.board, columns } };
    }
    case 'card_moved': {
      if (!state.board) return state;
      const { sourceColumnId, targetColumnId, sourceCards, targetCards } = action;
      const columns = state.board.columns.map((col) => {
        if (col.id === sourceColumnId && sourceColumnId !== targetColumnId) {
          return {
            ...col,
            cards: sourceCards.map((sc) => attachComments(sc, findCard(state.board, sc.id))),
          };
        }
        if (col.id === targetColumnId) {
          return {
            ...col,
            cards: targetCards.map((tc) => attachComments(tc, findCard(state.board, tc.id))),
          };
        }
        return col;
      });
      return { ...state, board: { ...state.board, columns } };
    }
    case 'comment_added': {
      if (!state.board) return state;
      const columns = state.board.columns.map((col) => ({
        ...col,
        cards: col.cards.map((card) => {
          if (card.id !== action.comment.card_id) return card;
          if (card.comments.some((c) => c.id === action.comment.id)) return card;
          return { ...card, comments: [...card.comments, action.comment] };
        }),
      }));
      return { ...state, board: { ...state.board, columns } };
    }
    case 'column_added': {
      if (!state.board) return state;
      if (state.board.columns.some((c) => c.id === action.column.id)) return state;
      const columns = [...state.board.columns, { ...action.column, cards: [] }].sort(
        (a, b) => a.position - b.position
      );
      return { ...state, board: { ...state.board, columns } };
    }
    default:
      return state;
  }
}

function findCard(board, cardId) {
  for (const col of board.columns) {
    const found = col.cards.find((c) => c.id === cardId);
    if (found) return found;
  }
  return null;
}

function attachComments(row, previous) {
  return {
    ...row,
    comments: previous?.comments || [],
  };
}

export function useBoardSocket(boardId, displayName) {
  const [state, dispatch] = useReducer(boardReducer, initialState);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const joinedIdRef = useRef(null);

  useEffect(() => {
    if (!boardId || !displayName) return undefined;

    const socket = getSocket();
    socketRef.current = socket;

    const handleConnect = () => {
      setConnected(true);
      dispatch({ type: 'set_status', status: 'joining' });
      emitAck(socket, 'join_board', { boardId, name: displayName })
        .then((res) => {
          joinedIdRef.current = boardId;
          dispatch({ type: 'set_board', board: res.board });
        })
        .catch((err) => dispatch({ type: 'set_error', error: err.message }));
    };

    const handleDisconnect = () => setConnected(false);
    const handleCardAdded = ({ card }) => dispatch({ type: 'card_added', card });
    const handleCardMoved = (payload) => dispatch({ type: 'card_moved', ...payload });
    const handleCommentAdded = ({ comment }) => dispatch({ type: 'comment_added', comment });
    const handleColumnAdded = ({ column }) => dispatch({ type: 'column_added', column });
    const handlePresence = ({ count }) => dispatch({ type: 'set_presence', count });

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('card_added', handleCardAdded);
    socket.on('card_moved', handleCardMoved);
    socket.on('comment_added', handleCommentAdded);
    socket.on('column_added', handleColumnAdded);
    socket.on('presence_updated', handlePresence);

    if (socket.connected) {
      handleConnect();
    } else {
      dispatch({ type: 'set_status', status: 'connecting' });
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('card_added', handleCardAdded);
      socket.off('card_moved', handleCardMoved);
      socket.off('comment_added', handleCommentAdded);
      socket.off('column_added', handleColumnAdded);
      socket.off('presence_updated', handlePresence);
      if (joinedIdRef.current) {
        socket.emit('leave_board');
        joinedIdRef.current = null;
      }
    };
  }, [boardId, displayName]);

  const addCard = useCallback(
    (columnId, content) => emitAck(socketRef.current, 'add_card', { columnId, content }),
    []
  );

  const moveCard = useCallback(
    (cardId, targetColumnId, targetIndex) =>
      emitAck(socketRef.current, 'move_card', { cardId, targetColumnId, targetIndex }),
    []
  );

  const addComment = useCallback(
    (cardId, content) => emitAck(socketRef.current, 'add_comment', { cardId, content }),
    []
  );

  const addColumnLocal = useCallback((column) => {
    dispatch({ type: 'column_added', column });
  }, []);

  return {
    state,
    connected,
    addCard,
    moveCard,
    addComment,
    addColumnLocal,
  };
}
