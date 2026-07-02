import { io } from 'socket.io-client';

let singleton = null;

export function getSocket() {
  if (!singleton) {
    singleton = io({
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return singleton;
}

export function emitAck(socket, event, payload, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} timeout`)), timeout);
    socket.emit(event, payload, (response) => {
      clearTimeout(timer);
      if (!response || response.ok === false) {
        reject(new Error(response?.error || 'server error'));
      } else {
        resolve(response);
      }
    });
  });
}
