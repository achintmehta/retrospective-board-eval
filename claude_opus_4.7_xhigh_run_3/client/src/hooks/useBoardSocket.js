import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useBoardSocket(boardId, { enabled, onCardAdded, onCardMoved, onCommentAdded }) {
  const socketRef = useRef(null);
  const handlersRef = useRef({});
  const [connected, setConnected] = useState(false);

  handlersRef.current = { onCardAdded, onCardMoved, onCommentAdded };

  useEffect(() => {
    if (!enabled || !boardId) return undefined;

    const socket = io({ path: '/socket.io' });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_board', boardId, (ack) => {
        if (!ack?.ok) {
          console.warn('Failed to join board', ack);
        }
      });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('card_added', (card) => {
      handlersRef.current.onCardAdded?.(card);
    });
    socket.on('card_moved', (payload) => {
      handlersRef.current.onCardMoved?.(payload);
    });
    socket.on('comment_added', (comment) => {
      handlersRef.current.onCommentAdded?.(comment);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [boardId, enabled]);

  function emitWithAck(event, payload) {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }
      socket.emit(event, payload, (ack) => {
        if (ack?.ok) resolve(ack);
        else reject(new Error(ack?.error || 'unknown_error'));
      });
    });
  }

  return {
    connected,
    addCard: (payload) => emitWithAck('add_card', payload),
    moveCard: (payload) => emitWithAck('move_card', payload),
    addComment: (payload) => emitWithAck('add_comment', payload),
  };
}
