import { io } from 'socket.io-client';

// Single shared Socket.io connection. The dev server proxies /socket.io to
// the Express server, so the relative URL works in both dev and prod.
let socket;

export function getSocket() {
  if (!socket) {
    socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
    });
  }
  return socket;
}
