import {
  boardExists,
  createCard,
  createComment,
  moveCard,
} from './db.js';

const MAX_CONTENT = 2000;
const MAX_NAME = 80;

function sanitize(str, max) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, max);
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.data.name = null;
    socket.data.boardId = null;

    socket.on('join_board', ({ boardId, displayName }, ack) => {
      if (!boardId || !boardExists(boardId)) {
        return ack?.({ error: 'board not found' });
      }
      const name = sanitize(displayName, MAX_NAME);
      if (!name) return ack?.({ error: 'display name is required' });

      if (socket.data.boardId) {
        socket.leave(`board:${socket.data.boardId}`);
      }
      socket.data.boardId = boardId;
      socket.data.name = name;
      socket.join(`board:${boardId}`);
      socket.to(`board:${boardId}`).emit('presence_joined', { name });
      ack?.({ ok: true });
    });

    socket.on('add_card', ({ columnId, content }, ack) => {
      const boardId = socket.data.boardId;
      const author = socket.data.name;
      if (!boardId || !author) return ack?.({ error: 'not joined' });
      const text = sanitize(content, MAX_CONTENT);
      if (!text) return ack?.({ error: 'content is required' });
      const result = createCard(columnId, text, author);
      if (!result) return ack?.({ error: 'column not found' });
      io.to(`board:${result.boardId}`).emit('card_added', {
        card: result.card,
      });
      ack?.({ ok: true, card: result.card });
    });

    socket.on(
      'move_card',
      ({ cardId, toColumnId, toPosition }, ack) => {
        const boardId = socket.data.boardId;
        if (!boardId) return ack?.({ error: 'not joined' });
        if (
          !cardId ||
          !toColumnId ||
          typeof toPosition !== 'number' ||
          toPosition < 0
        ) {
          return ack?.({ error: 'invalid move payload' });
        }
        const result = moveCard(cardId, toColumnId, toPosition);
        if (!result) return ack?.({ error: 'card or column not found' });
        io.to(`board:${result.boardId}`).emit('card_moved', {
          cardId: result.cardId,
          fromColumnId: result.fromColumnId,
          toColumnId: result.toColumnId,
          toPosition: result.toPosition,
        });
        ack?.({ ok: true });
      }
    );

    socket.on('add_comment', ({ cardId, content }, ack) => {
      const boardId = socket.data.boardId;
      const author = socket.data.name;
      if (!boardId || !author) return ack?.({ error: 'not joined' });
      const text = sanitize(content, MAX_CONTENT);
      if (!text) return ack?.({ error: 'content is required' });
      const result = createComment(cardId, text, author);
      if (!result) return ack?.({ error: 'card not found' });
      io.to(`board:${result.boardId}`).emit('comment_added', {
        comment: result.comment,
      });
      ack?.({ ok: true, comment: result.comment });
    });

    socket.on('disconnect', () => {
      const boardId = socket.data.boardId;
      const name = socket.data.name;
      if (boardId && name) {
        socket.to(`board:${boardId}`).emit('presence_left', { name });
      }
    });
  });
}
