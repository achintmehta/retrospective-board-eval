import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io({
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
    });
  }
  return socket;
}

export function emitWithAck(event, payload, timeoutMs = 8000) {
  const s = getSocket();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} timed out`)), timeoutMs);
    s.emit(event, payload, (ack) => {
      clearTimeout(timer);
      if (!ack || ack.ok === false) {
        reject(new Error(ack?.error || `${event} failed`));
        return;
      }
      resolve(ack);
    });
  });
}
