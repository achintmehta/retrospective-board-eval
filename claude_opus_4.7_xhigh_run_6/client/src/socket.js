import { io } from 'socket.io-client';

let socket;

export function getSocket() {
  if (!socket) {
    socket = io({
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function emitWithAck(event, payload) {
  const s = getSocket();
  return new Promise((resolve) => {
    s.emit(event, payload, (response) => resolve(response));
  });
}
