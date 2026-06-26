import {
  createCard,
  moveCard,
  createComment,
} from './repository.js';

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    let joinedBoard = null;

    socket.on('join_board', ({ boardId, displayName }, ack) => {
      if (!boardId) return ack?.({ ok: false, error: 'boardId required' });
      if (joinedBoard) socket.leave(joinedBoard);
      joinedBoard = boardId;
      socket.data.displayName = displayName || 'Guest';
      socket.join(boardId);

      // notify others of presence
      socket.to(boardId).emit('presence_join', { displayName: socket.data.displayName });
      ack?.({ ok: true });
    });

    socket.on('add_card', ({ boardId, columnId, content }, ack) => {
      if (!boardId || !columnId || !content?.trim()) {
        return ack?.({ ok: false, error: 'invalid payload' });
      }
      const author = socket.data.displayName || 'Guest';
      const result = createCard(columnId, content.trim(), author);
      if (!result) return ack?.({ ok: false, error: 'column not found' });
      io.to(boardId).emit('card_added', { card: { ...result.card, comments: [] } });
      ack?.({ ok: true, card: result.card });
    });

    socket.on('move_card', ({ boardId, cardId, toColumnId, toPosition }, ack) => {
      if (!boardId || !cardId || !toColumnId || typeof toPosition !== 'number') {
        return ack?.({ ok: false, error: 'invalid payload' });
      }
      const result = moveCard(cardId, toColumnId, toPosition);
      if (!result) return ack?.({ ok: false, error: 'card not found' });
      io.to(boardId).emit('card_moved', {
        card: result.card,
        fromColumnId: result.fromColumnId,
      });
      ack?.({ ok: true });
    });

    socket.on('add_comment', ({ boardId, cardId, content }, ack) => {
      if (!boardId || !cardId || !content?.trim()) {
        return ack?.({ ok: false, error: 'invalid payload' });
      }
      const author = socket.data.displayName || 'Guest';
      const result = createComment(cardId, content.trim(), author);
      if (!result) return ack?.({ ok: false, error: 'card not found' });
      io.to(boardId).emit('comment_added', { cardId, comment: result.comment });
      ack?.({ ok: true });
    });

    socket.on('disconnect', () => {
      if (joinedBoard && socket.data.displayName) {
        socket.to(joinedBoard).emit('presence_leave', {
          displayName: socket.data.displayName,
        });
      }
    });
  });
}
