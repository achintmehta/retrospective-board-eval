import { io } from 'socket.io-client';

// One shared connection per browser tab. Vite's dev server proxies /socket.io
// to the Express server; in production the same origin serves both.
let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io('/', {
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

// Wrap callback-style emits in a Promise so callers can `await` them.
export function emitWithAck(event, payload) {
  return new Promise((resolve, reject) => {
    getSocket().emit(event, payload, (response) => {
      if (response && response.ok === false) {
        reject(new Error(response.error || 'socket error'));
      } else {
        resolve(response);
      }
    });
  });
}
