import { Server } from 'socket.io';
import {
  addCard,
  moveCard,
  addComment,
  ValidationError,
  NotFoundError,
} from './repository.js';

export const roomFor = (boardId) => `board:${boardId}`;

function ack(callback, payload) {
  if (typeof callback === 'function') callback(payload);
}

function handleEventError(err, callback, label) {
  if (err instanceof ValidationError || err instanceof NotFoundError) {
    ack(callback, { ok: false, error: err.message });
    return;
  }
  console.error(`[socket] ${label} failed`, err);
  ack(callback, { ok: false, error: 'Internal server error' });
}

export function attachSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
    serveClient: false,
  });

  io.on('connection', (socket) => {
    socket.data.boardId = null;
    socket.data.displayName = null;

    socket.on('join_board', ({ boardId, displayName } = {}, callback) => {
      try {
        if (!boardId || typeof boardId !== 'string') {
          throw new ValidationError('boardId is required');
        }
        if (socket.data.boardId && socket.data.boardId !== boardId) {
          socket.leave(roomFor(socket.data.boardId));
        }
        socket.join(roomFor(boardId));
        socket.data.boardId = boardId;
        socket.data.displayName = (displayName || '').toString().slice(0, 60) || 'Guest';

        socket.to(roomFor(boardId)).emit('presence_joined', {
          displayName: socket.data.displayName,
        });

        ack(callback, { ok: true });
      } catch (err) {
        handleEventError(err, callback, 'join_board');
      }
    });

    socket.on('add_card', ({ boardId, columnId, content } = {}, callback) => {
      try {
        const targetBoardId = boardId || socket.data.boardId;
        if (!targetBoardId) throw new ValidationError('Not joined to a board');
        if (!columnId) throw new ValidationError('columnId is required');

        const card = addCard({
          boardId: targetBoardId,
          columnId,
          content,
          authorName: socket.data.displayName || 'Guest',
        });
        io.to(roomFor(targetBoardId)).emit('card_added', { columnId, card });
        ack(callback, { ok: true, card });
      } catch (err) {
        handleEventError(err, callback, 'add_card');
      }
    });

    socket.on('move_card', ({ cardId, toColumnId, toIndex } = {}, callback) => {
      try {
        if (!cardId || !toColumnId) {
          throw new ValidationError('cardId and toColumnId are required');
        }
        const result = moveCard({ cardId, toColumnId, toIndex });
        const targetBoardId = socket.data.boardId;
        if (targetBoardId) {
          io.to(roomFor(targetBoardId)).emit('card_moved', {
            cardId,
            sourceColumnId: result.sourceColumnId,
            destinationColumnId: result.destinationColumnId,
            sourceOrder: result.sourceOrder,
            destinationOrder: result.destinationOrder,
            card: result.card,
          });
        }
        ack(callback, { ok: true });
      } catch (err) {
        handleEventError(err, callback, 'move_card');
      }
    });

    socket.on('add_comment', ({ cardId, content } = {}, callback) => {
      try {
        if (!cardId) throw new ValidationError('cardId is required');
        const result = addComment({
          cardId,
          content,
          authorName: socket.data.displayName || 'Guest',
        });
        const targetBoardId = result.boardId || socket.data.boardId;
        if (targetBoardId) {
          io.to(roomFor(targetBoardId)).emit('comment_added', {
            cardId,
            comment: result.comment,
          });
        }
        ack(callback, { ok: true, comment: result.comment });
      } catch (err) {
        handleEventError(err, callback, 'add_comment');
      }
    });

    socket.on('disconnect', () => {
      if (socket.data.boardId && socket.data.displayName) {
        socket.to(roomFor(socket.data.boardId)).emit('presence_left', {
          displayName: socket.data.displayName,
        });
      }
    });
  });

  return io;
}
