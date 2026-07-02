import { io, Socket } from 'socket.io-client';

let instance: Socket | null = null;

export function getSocket(): Socket {
  if (!instance) {
    instance = io({
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }
  return instance;
}
