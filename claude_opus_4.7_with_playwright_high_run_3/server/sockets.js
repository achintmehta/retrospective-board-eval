const { addCard, moveCard, addComment } = require('./db');

function roomFor(boardId) {
  return `board:${boardId}`;
}

function attachSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.data.boards = new Set();

    socket.on('join_board', ({ boardId }, ack) => {
      if (!boardId) return ack?.({ ok: false, error: 'boardId required' });
      socket.join(roomFor(boardId));
      socket.data.boards.add(boardId);
      ack?.({ ok: true });
    });

    socket.on('leave_board', ({ boardId }) => {
      if (!boardId) return;
      socket.leave(roomFor(boardId));
      socket.data.boards.delete(boardId);
    });

    socket.on('add_card', ({ boardId, columnId, content, authorName }, ack) => {
      const trimmed = (content || '').trim();
      const author = (authorName || '').trim() || 'Anonymous';
      if (!boardId || !columnId || !trimmed) {
        return ack?.({ ok: false, error: 'boardId, columnId, content required' });
      }
      const result = addCard({ columnId, content: trimmed, authorName: author });
      if (!result) return ack?.({ ok: false, error: 'column not found' });
      io.to(roomFor(boardId)).emit('card_added', { card: result.card });
      ack?.({ ok: true, card: result.card });
    });

    socket.on('move_card', ({ boardId, cardId, newColumnId, newPosition }, ack) => {
      if (!boardId || !cardId || !newColumnId || typeof newPosition !== 'number') {
        return ack?.({ ok: false, error: 'boardId, cardId, newColumnId, newPosition required' });
      }
      const result = moveCard({ cardId, newColumnId, newPosition });
      if (!result) return ack?.({ ok: false, error: 'card or column not found' });
      io.to(roomFor(boardId)).emit('card_moved', {
        cardId: result.cardId,
        newColumnId: result.newColumnId,
        newPosition: result.newPosition,
        oldColumnId: result.oldColumnId,
      });
      ack?.({ ok: true });
    });

    socket.on('add_comment', ({ boardId, cardId, content, authorName }, ack) => {
      const trimmed = (content || '').trim();
      const author = (authorName || '').trim() || 'Anonymous';
      if (!boardId || !cardId || !trimmed) {
        return ack?.({ ok: false, error: 'boardId, cardId, content required' });
      }
      const result = addComment({ cardId, content: trimmed, authorName: author });
      if (!result) return ack?.({ ok: false, error: 'card not found' });
      io.to(roomFor(boardId)).emit('comment_added', { comment: result.comment });
      ack?.({ ok: true, comment: result.comment });
    });
  });
}

module.exports = { attachSocketHandlers };
