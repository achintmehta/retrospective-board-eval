import { useCallback, useEffect, useRef, useState } from 'react';
import { io as createSocket } from 'socket.io-client';

/**
 * Connect to the board's socket.io room and surface a stable API for emitting board events.
 *
 * - Re-joins the room on reconnect.
 * - Calls `onEvent(type, payload)` for every server-broadcast event so the page can update state.
 */
export function useBoardSocket({ boardId, displayName, onEvent }) {
  const [status, setStatus] = useState('connecting'); // connecting | connected | disconnected
  const [participants, setParticipants] = useState([]);
  const socketRef = useRef(null);
  const onEventRef = useRef(onEvent);

  // Keep the latest callback without retriggering effects
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!boardId || !displayName) return undefined;

    const socket = createSocket({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
    socketRef.current = socket;

    const joinRoom = () => {
      socket.emit('join_board', { boardId, displayName }, (ack) => {
        if (ack?.ok) {
          setParticipants(ack.data?.participants || []);
        }
      });
    };

    socket.on('connect', () => {
      setStatus('connected');
      joinRoom();
    });
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => setStatus('disconnected'));

    const forward = (type) => (payload) => {
      onEventRef.current?.(type, payload);
    };

    socket.on('card_added', forward('card_added'));
    socket.on('card_moved', forward('card_moved'));
    socket.on('comment_added', forward('comment_added'));
    socket.on('column_added', forward('column_added'));
    socket.on('participants_updated', (list) => setParticipants(list || []));

    return () => {
      socket.emit('leave_board');
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [boardId, displayName]);

  const emitWithAck = useCallback((event, payload) => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket || !socket.connected) {
        reject(new Error('Not connected to the board.'));
        return;
      }
      socket.emit(event, payload, (ack) => {
        if (ack?.ok) resolve(ack.data);
        else reject(new Error(ack?.error || 'Action failed'));
      });
    });
  }, []);

  const addCard = useCallback(
    (columnId, content) =>
      emitWithAck('add_card', { boardId, columnId, content }),
    [emitWithAck, boardId]
  );

  const moveCard = useCallback(
    (cardId, toColumnId, toIndex) =>
      emitWithAck('move_card', { boardId, cardId, toColumnId, toIndex }),
    [emitWithAck, boardId]
  );

  const addComment = useCallback(
    (cardId, content) =>
      emitWithAck('add_comment', { boardId, cardId, content }),
    [emitWithAck, boardId]
  );

  return { status, participants, addCard, moveCard, addComment };
}
