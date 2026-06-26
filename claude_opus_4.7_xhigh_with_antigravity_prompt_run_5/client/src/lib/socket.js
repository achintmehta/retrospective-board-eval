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

export function emitWithAck(event, payload, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    const timer = setTimeout(() => reject(new Error('Network timeout')), timeoutMs);
    s.emit(event, payload, (response) => {
      clearTimeout(timer);
      if (!response) return reject(new Error('No response from server'));
      if (response.ok) resolve(response);
      else reject(new Error(response.error || 'Operation failed'));
    });
  });
}
