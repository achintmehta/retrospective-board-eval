import { Server } from 'socket.io';
import { addCard, moveCard, addComment } from './db.js';

export function attachSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  io.on('connection', (socket) => {
    let joinedBoardId = null;

    socket.on('join_board', ({ boardId }) => {
      if (!boardId) return;
      if (joinedBoardId) socket.leave(`board:${joinedBoardId}`);
      joinedBoardId = boardId;
      socket.join(`board:${boardId}`);
    });

    socket.on('leave_board', ({ boardId }) => {
      if (!boardId) return;
      socket.leave(`board:${boardId}`);
      if (joinedBoardId === boardId) joinedBoardId = null;
    });

    socket.on('add_card', (payload, ack) => {
      try {
        const { boardId, columnId, content, authorName } = payload || {};
        if (!boardId || !columnId || !content || !authorName) {
          return typeof ack === 'function' && ack({ ok: false, error: 'missing fields' });
        }
        const card = addCard({ columnId, content, authorName });
        if (!card) {
          return typeof ack === 'function' && ack({ ok: false, error: 'column not found' });
        }
        io.to(`board:${boardId}`).emit('card_added', card);
        if (typeof ack === 'function') ack({ ok: true, card });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    });

    socket.on('move_card', (payload, ack) => {
      try {
        const { boardId, cardId, toColumnId, toIndex } = payload || {};
        if (!boardId || !cardId || !toColumnId || toIndex === undefined) {
          return typeof ack === 'function' && ack({ ok: false, error: 'missing fields' });
        }
        const result = moveCard({ cardId, toColumnId, toIndex });
        if (!result) {
          return typeof ack === 'function' && ack({ ok: false, error: 'card or column not found' });
        }
        io.to(`board:${boardId}`).emit('card_moved', result);
        if (typeof ack === 'function') ack({ ok: true, result });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    });

    socket.on('add_comment', (payload, ack) => {
      try {
        const { boardId, cardId, content, authorName } = payload || {};
        if (!boardId || !cardId || !content || !authorName) {
          return typeof ack === 'function' && ack({ ok: false, error: 'missing fields' });
        }
        const comment = addComment({ cardId, content, authorName });
        if (!comment) {
          return typeof ack === 'function' && ack({ ok: false, error: 'card not found' });
        }
        io.to(`board:${boardId}`).emit('comment_added', comment);
        if (typeof ack === 'function') ack({ ok: true, comment });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    });

  });

  return io;
}
