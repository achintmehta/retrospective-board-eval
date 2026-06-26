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

export function emitWithAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket.emit(event, payload, (ack) => {
      if (ack && ack.ok) {
        resolve(ack);
      } else {
        reject(new Error((ack && ack.error) || 'socket request failed'));
      }
    });
  });
}
