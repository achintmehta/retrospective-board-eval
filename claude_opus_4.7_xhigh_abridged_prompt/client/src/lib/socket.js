import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (socket) return socket;
  socket = io({
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 400,
    reconnectionDelayMax: 4000,
    transports: ['websocket', 'polling'],
  });
  return socket;
}
