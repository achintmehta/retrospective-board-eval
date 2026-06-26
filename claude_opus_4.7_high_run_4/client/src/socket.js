import { io } from 'socket.io-client';

// Same-origin in prod; in dev Vite proxies /socket.io to the backend.
export function createSocket() {
  return io('/', {
    autoConnect: true,
    transports: ['websocket', 'polling'],
  });
}
