import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io({
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function emitAck(event, payload) {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    s.emit(event, payload, (response) => {
      if (response?.ok) resolve(response);
      else reject(new Error(response?.error || 'Socket error'));
    });
  });
}
