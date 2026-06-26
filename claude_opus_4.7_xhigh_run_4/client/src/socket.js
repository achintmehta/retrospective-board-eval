import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io({
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

export function emitWithAck(event, payload, timeoutMs = 5000) {
  const s = getSocket();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out: ${event}`)), timeoutMs);
    s.emit(event, payload, (ack) => {
      clearTimeout(timer);
      if (ack?.ok) resolve(ack);
      else reject(new Error(ack?.error || 'unknown error'));
    });
  });
}
