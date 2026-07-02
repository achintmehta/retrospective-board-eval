import { io } from 'socket.io-client';

export function createBoardSocket() {
  return io('/', {
    autoConnect: true,
    transports: ['websocket', 'polling'],
  });
}
