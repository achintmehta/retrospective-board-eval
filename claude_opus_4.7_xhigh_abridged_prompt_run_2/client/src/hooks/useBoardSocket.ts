import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { BoardWithChildren, CardRow, CommentRow, BoardColumnRow } from '../types';

/* Wire event names — must match server/src/realtime/events.ts */
const EVT = {
  JOIN_BOARD: 'join_board',
  LEAVE_BOARD: 'leave_board',
  ADD_CARD: 'add_card',
  MOVE_CARD: 'move_card',
  ADD_COMMENT: 'add_comment',
  CARD_ADDED: 'card_added',
  CARD_MOVED: 'card_moved',
  COMMENT_ADDED: 'comment_added',
  COLUMN_ADDED: 'column_added',
  PRESENCE: 'presence',
} as const;

type BoardAction =
  | { type: 'init'; board: BoardWithChildren }
  | { type: 'card_added'; card: CardRow }
  | { type: 'card_moved'; card: CardRow; sourceColumnId: string; targetIndex: number }
  | { type: 'comment_added'; comment: CommentRow }
  | { type: 'column_added'; column: BoardColumnRow };

function boardReducer(state: BoardWithChildren | null, action: BoardAction): BoardWithChildren | null {
  if (action.type === 'init') return action.board;
  if (!state) return state;

  switch (action.type) {
    case 'card_added': {
      const { card } = action;
      // Ignore if we already have the card (avoids duplicates from optimistic UI)
      const exists = state.columns.some((c) => c.cards.some((cd) => cd.id === card.id));
      if (exists) return state;
      return {
        ...state,
        columns: state.columns.map((col) => {
          if (col.id !== card.column_id) return col;
          return {
            ...col,
            cards: [...col.cards, { ...card, comments: [] }].sort(
              (a, b) => a.position - b.position
            ),
          };
        }),
      };
    }
    case 'card_moved': {
      const { card, sourceColumnId } = action;
      // Preserve any comments the card had locally
      let comments: CommentRow[] = [];
      for (const col of state.columns) {
        const found = col.cards.find((c) => c.id === card.id);
        if (found) {
          comments = found.comments;
          break;
        }
      }
      const withoutCard = state.columns.map((col) => {
        if (col.id !== sourceColumnId && col.id !== card.column_id) return col;
        return {
          ...col,
          cards: col.cards.filter((c) => c.id !== card.id),
        };
      });
      const withCard = withoutCard.map((col) => {
        if (col.id !== card.column_id) return col;
        const next = [...col.cards, { ...card, comments }];
        next.sort((a, b) => a.position - b.position);
        return { ...col, cards: next };
      });
      return { ...state, columns: withCard };
    }
    case 'comment_added': {
      const { comment } = action;
      return {
        ...state,
        columns: state.columns.map((col) => ({
          ...col,
          cards: col.cards.map((card) =>
            card.id === comment.card_id
              ? {
                  ...card,
                  comments: card.comments.some((c) => c.id === comment.id)
                    ? card.comments
                    : [...card.comments, comment],
                }
              : card
          ),
        })),
      };
    }
    case 'column_added': {
      if (state.columns.some((c) => c.id === action.column.id)) return state;
      return {
        ...state,
        columns: [...state.columns, { ...action.column, cards: [] }].sort(
          (a, b) => a.position - b.position
        ),
      };
    }
    default:
      return state;
  }
}

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface UseBoardSocketResult {
  board: BoardWithChildren | null;
  status: ConnectionStatus;
  error: string | null;
  presence: string[];
  addCard: (columnId: string, content: string) => void;
  moveCard: (cardId: string, targetColumnId: string, targetIndex: number) => void;
  addComment: (cardId: string, content: string) => void;
  refresh: () => void;
}

export function useBoardSocket(
  boardId: string | undefined,
  displayName: string | null
): UseBoardSocketResult {
  const [board, dispatch] = useReducer(boardReducer, null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [presence, setPresence] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const displayNameRef = useRef<string | null>(displayName);
  displayNameRef.current = displayName;

  useEffect(() => {
    if (!boardId || !displayName) return;

    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    socketRef.current = socket;
    setStatus('connecting');
    setError(null);

    const rejoin = () => {
      socket.emit(
        EVT.JOIN_BOARD,
        { boardId, displayName: displayNameRef.current },
        (resp: { ok?: boolean; board?: BoardWithChildren; error?: string }) => {
          if (resp?.error) {
            setError(resp.error);
            setStatus('error');
            return;
          }
          if (resp?.board) dispatch({ type: 'init', board: resp.board });
          setStatus('connected');
        }
      );
    };

    socket.on('connect', () => {
      rejoin();
    });
    socket.on('disconnect', () => {
      setStatus('reconnecting');
    });
    socket.on('connect_error', () => {
      setStatus('reconnecting');
    });

    socket.on(EVT.CARD_ADDED, ({ card }: { card: CardRow }) => {
      dispatch({ type: 'card_added', card });
    });
    socket.on(
      EVT.CARD_MOVED,
      ({ card, sourceColumnId, targetIndex }: { card: CardRow; sourceColumnId: string; targetIndex: number }) => {
        dispatch({ type: 'card_moved', card, sourceColumnId, targetIndex });
      }
    );
    socket.on(EVT.COMMENT_ADDED, (comment: CommentRow) => {
      dispatch({ type: 'comment_added', comment });
    });
    socket.on(EVT.COLUMN_ADDED, (column: BoardColumnRow) => {
      dispatch({ type: 'column_added', column });
    });
    socket.on(EVT.PRESENCE, (payload: { users: string[] }) => {
      setPresence(payload?.users ?? []);
    });

    return () => {
      socket.emit(EVT.LEAVE_BOARD, { boardId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [boardId, displayName]);

  const addCard = useCallback(
    (columnId: string, content: string) => {
      const socket = socketRef.current;
      if (!socket || !boardId) return;
      socket.emit(EVT.ADD_CARD, {
        boardId,
        columnId,
        content,
        authorName: displayNameRef.current ?? 'Guest',
      });
    },
    [boardId]
  );

  const moveCard = useCallback(
    (cardId: string, targetColumnId: string, targetIndex: number) => {
      const socket = socketRef.current;
      if (!socket || !boardId) return;
      socket.emit(EVT.MOVE_CARD, {
        boardId,
        cardId,
        targetColumnId,
        targetIndex,
      });
    },
    [boardId]
  );

  const addComment = useCallback(
    (cardId: string, content: string) => {
      const socket = socketRef.current;
      if (!socket || !boardId) return;
      socket.emit(EVT.ADD_COMMENT, {
        boardId,
        cardId,
        content,
        authorName: displayNameRef.current ?? 'Guest',
      });
    },
    [boardId]
  );

  const refresh = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !boardId) return;
    socket.emit(
      EVT.JOIN_BOARD,
      { boardId, displayName: displayNameRef.current },
      (resp: { board?: BoardWithChildren }) => {
        if (resp?.board) dispatch({ type: 'init', board: resp.board });
      }
    );
  }, [boardId]);

  return useMemo(
    () => ({ board, status, error, presence, addCard, moveCard, addComment, refresh }),
    [board, status, error, presence, addCard, moveCard, addComment, refresh]
  );
}
