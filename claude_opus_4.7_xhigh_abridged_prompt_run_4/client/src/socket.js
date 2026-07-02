import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (socket) return socket;
  socket = io({
    autoConnect: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 500
  });
  return socket;
}
