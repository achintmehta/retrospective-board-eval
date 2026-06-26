import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useBoardSocket({ boardId, displayName, enabled, onEvent }) {
  const [status, setStatus] = useState('idle');
  const [presence, setPresence] = useState(1);
  const socketRef = useRef(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled || !boardId || !displayName) return undefined;
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    socketRef.current = socket;
    setStatus('connecting');

    const handleJoin = () => {
      socket.emit('join_board', { boardId, displayName }, (ack) => {
        if (ack?.ok) {
          setStatus('connected');
        } else {
          setStatus('error');
        }
      });
    };

    socket.on('connect', handleJoin);
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => setStatus('error'));

    socket.on('card_added', (payload) => onEventRef.current?.('card_added', payload));
    socket.on('card_moved', (payload) => onEventRef.current?.('card_moved', payload));
    socket.on('comment_added', (payload) => onEventRef.current?.('comment_added', payload));
    socket.on('column_added', (payload) => onEventRef.current?.('column_added', payload));
    socket.on('presence', (payload) => {
      if (typeof payload?.count === 'number') setPresence(payload.count);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [boardId, displayName, enabled]);

  const emit = (event, payload) =>
    new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket || !socket.connected) {
        resolve({ ok: false, error: 'Not connected.' });
        return;
      }
      socket.emit(event, payload, (ack) => resolve(ack ?? { ok: true }));
    });

  return { status, presence, emit };
}
