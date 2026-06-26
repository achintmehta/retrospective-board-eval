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
  const s = getSocket();
  return new Promise((resolve, reject) => {
    s.timeout(5000).emit(event, payload, (err, response) => {
      if (err) return reject(err);
      if (response && response.ok === false) return reject(new Error(response.error || 'Error'));
      resolve(response);
    });
  });
}
