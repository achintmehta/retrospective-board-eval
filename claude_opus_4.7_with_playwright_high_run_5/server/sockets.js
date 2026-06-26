import { addCard, moveCard, addComment, boardExists } from './dao.js';

const MAX_CONTENT = 4000;
const MAX_NAME = 80;

function sanitize(value, max) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) return null;
  return trimmed;
}

function ack(callback, payload) {
  if (typeof callback === 'function') callback(payload);
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    // Track the room this socket has joined, so per-event broadcasts can target it.
    socket.data.boardId = null;

    socket.on('join_board', ({ boardId, displayName } = {}, callback) => {
      if (typeof boardId !== 'string' || !boardExists(boardId)) {
        return ack(callback, { ok: false, error: 'board not found' });
      }
      const name = sanitize(displayName, MAX_NAME);
      if (!name) {
        return ack(callback, { ok: false, error: 'displayName required' });
      }

      // Leave any prior room before joining a new one.
      if (socket.data.boardId && socket.data.boardId !== boardId) {
        socket.leave(socket.data.boardId);
      }
      socket.data.boardId = boardId;
      socket.data.displayName = name;
      socket.join(boardId);
      ack(callback, { ok: true });
    });

    socket.on('add_card', ({ columnId, content } = {}, callback) => {
      if (!socket.data.boardId) {
        return ack(callback, { ok: false, error: 'join a board first' });
      }
      const text = sanitize(content, MAX_CONTENT);
      if (typeof columnId !== 'string' || !text) {
        return ack(callback, { ok: false, error: 'invalid payload' });
      }
      const result = addCard({
        columnId,
        content: text,
        authorName: socket.data.displayName,
      });
      if (!result || result.boardId !== socket.data.boardId) {
        return ack(callback, { ok: false, error: 'column not found' });
      }
      io.to(result.boardId).emit('card_added', result.card);
      ack(callback, { ok: true, card: result.card });
    });

    socket.on(
      'move_card',
      ({ cardId, toColumnId, toPosition } = {}, callback) => {
        if (!socket.data.boardId) {
          return ack(callback, { ok: false, error: 'join a board first' });
        }
        if (
          typeof cardId !== 'string' ||
          typeof toColumnId !== 'string' ||
          !Number.isInteger(toPosition) ||
          toPosition < 0
        ) {
          return ack(callback, { ok: false, error: 'invalid payload' });
        }
        const result = moveCard({ cardId, toColumnId, toPosition });
        if (!result || result.boardId !== socket.data.boardId) {
          return ack(callback, { ok: false, error: 'card not found' });
        }
        io.to(result.boardId).emit('card_moved', result.move);
        ack(callback, { ok: true });
      }
    );

    socket.on('add_comment', ({ cardId, content } = {}, callback) => {
      if (!socket.data.boardId) {
        return ack(callback, { ok: false, error: 'join a board first' });
      }
      const text = sanitize(content, MAX_CONTENT);
      if (typeof cardId !== 'string' || !text) {
        return ack(callback, { ok: false, error: 'invalid payload' });
      }
      const result = addComment({
        cardId,
        content: text,
        authorName: socket.data.displayName,
      });
      if (!result || result.boardId !== socket.data.boardId) {
        return ack(callback, { ok: false, error: 'card not found' });
      }
      io.to(result.boardId).emit('comment_added', result.comment);
      ack(callback, { ok: true, comment: result.comment });
    });
  });
}
