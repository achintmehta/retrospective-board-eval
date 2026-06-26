import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    // Same-origin connection; Vite proxies /socket.io to the backend in dev.
    socket = io({ autoConnect: true, transports: ['websocket', 'polling'] });
  }
  return socket;
}
