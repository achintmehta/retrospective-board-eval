import { Server } from 'socket.io';
import { createCard, moveCard, createComment } from './repository.js';

export function attachSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    socket.on('join_board', ({ boardId }, ack) => {
      if (!boardId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'boardId required' });
        return;
      }
      socket.join(`board:${boardId}`);
      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('leave_board', ({ boardId }) => {
      if (boardId) socket.leave(`board:${boardId}`);
    });

    socket.on('add_card', ({ columnId, content, authorName }, ack) => {
      try {
        const { card, boardId } = createCard({ columnId, content, authorName });
        io.to(`board:${boardId}`).emit('card_added', card);
        if (typeof ack === 'function') ack({ ok: true, card });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    });

    socket.on('move_card', ({ cardId, toColumnId, toPosition }, ack) => {
      try {
        const { card, boardId } = moveCard({ cardId, toColumnId, toPosition });
        io.to(`board:${boardId}`).emit('card_moved', card);
        if (typeof ack === 'function') ack({ ok: true, card });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    });

    socket.on('add_comment', ({ cardId, content, authorName }, ack) => {
      try {
        const { comment, boardId } = createComment({ cardId, content, authorName });
        io.to(`board:${boardId}`).emit('comment_added', comment);
        if (typeof ack === 'function') ack({ ok: true, comment });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    });
  });

  return io;
}
