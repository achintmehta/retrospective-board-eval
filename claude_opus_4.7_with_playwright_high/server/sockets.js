import { addCard, moveCard, addComment } from './db.js';

export function attachSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('join_board', ({ boardId }) => {
      if (!boardId) return;
      socket.join(roomFor(boardId));
    });

    socket.on('leave_board', ({ boardId }) => {
      if (!boardId) return;
      socket.leave(roomFor(boardId));
    });

    socket.on('add_card', (payload, ack) => {
      const { columnId, content, authorName } = payload || {};
      if (!columnId || !content || !authorName) {
        return ack?.({ error: 'columnId, content, authorName required' });
      }
      const result = addCard({
        columnId,
        content: String(content).trim(),
        authorName: String(authorName).trim(),
      });
      if (!result) return ack?.({ error: 'column not found' });
      io.to(roomFor(result.boardId)).emit('card_added', result.card);
      ack?.({ ok: true, card: result.card });
    });

    socket.on('move_card', (payload, ack) => {
      const { cardId, toColumnId, toPosition } = payload || {};
      if (!cardId || !toColumnId || typeof toPosition !== 'number') {
        return ack?.({ error: 'cardId, toColumnId, toPosition required' });
      }
      const result = moveCard({
        cardId,
        toColumnId,
        toPosition: Math.max(0, Math.floor(toPosition)),
      });
      if (!result) return ack?.({ error: 'card or column not found' });
      io.to(roomFor(result.boardId)).emit('card_moved', {
        cardId: result.cardId,
        toColumnId: result.toColumnId,
        toPosition: result.toPosition,
      });
      ack?.({ ok: true });
    });

    socket.on('add_comment', (payload, ack) => {
      const { cardId, content, authorName } = payload || {};
      if (!cardId || !content || !authorName) {
        return ack?.({ error: 'cardId, content, authorName required' });
      }
      const result = addComment({
        cardId,
        content: String(content).trim(),
        authorName: String(authorName).trim(),
      });
      if (!result) return ack?.({ error: 'card not found' });
      io.to(roomFor(result.boardId)).emit('comment_added', result.comment);
      ack?.({ ok: true, comment: result.comment });
    });
  });
}

function roomFor(boardId) {
  return `board:${boardId}`;
}
