import { io } from 'socket.io-client';

// One shared singleton socket — Socket.io will multiplex board rooms over it.
// We connect lazily so unauthenticated routes (the main page) don't open a socket.
let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io({
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
