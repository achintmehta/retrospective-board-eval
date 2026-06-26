const {
  createCard,
  moveCard,
  createComment,
  getColumnBoardId,
  getCardBoardId,
} = require('./db');

function boardRoom(boardId) {
  return `board:${boardId}`;
}

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.data.boardId = null;
    socket.data.displayName = null;

    socket.on('join_board', ({ boardId, displayName }, ack) => {
      if (!boardId) {
        if (typeof ack === 'function') ack({ error: 'boardId is required' });
        return;
      }
      // Leave previous board room, if any
      if (socket.data.boardId && socket.data.boardId !== boardId) {
        socket.leave(boardRoom(socket.data.boardId));
      }
      socket.data.boardId = boardId;
      socket.data.displayName = (displayName || 'Guest').toString().trim() || 'Guest';
      socket.join(boardRoom(boardId));
      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('add_card', (payload, ack) => {
      try {
        const { columnId, content } = payload || {};
        if (!columnId || !content || !String(content).trim()) {
          throw new Error('columnId and content are required');
        }
        const boardId = getColumnBoardId(columnId);
        if (!boardId || boardId !== socket.data.boardId) {
          throw new Error('not joined to this board');
        }
        const card = createCard({
          columnId,
          content,
          authorName: socket.data.displayName || 'Guest',
        });
        io.to(boardRoom(boardId)).emit('card_added', { card });
        if (typeof ack === 'function') ack({ ok: true, card });
      } catch (err) {
        if (typeof ack === 'function') ack({ error: err.message });
      }
    });

    socket.on('move_card', (payload, ack) => {
      try {
        const { cardId, toColumnId, toIndex } = payload || {};
        if (!cardId || !toColumnId) {
          throw new Error('cardId and toColumnId are required');
        }
        const boardId = getCardBoardId(cardId);
        if (!boardId || boardId !== socket.data.boardId) {
          throw new Error('not joined to this board');
        }
        const card = moveCard({ cardId, toColumnId, toIndex });
        io.to(boardRoom(boardId)).emit('card_moved', { card });
        if (typeof ack === 'function') ack({ ok: true, card });
      } catch (err) {
        if (typeof ack === 'function') ack({ error: err.message });
      }
    });

    socket.on('add_comment', (payload, ack) => {
      try {
        const { cardId, content } = payload || {};
        if (!cardId || !content || !String(content).trim()) {
          throw new Error('cardId and content are required');
        }
        const boardId = getCardBoardId(cardId);
        if (!boardId || boardId !== socket.data.boardId) {
          throw new Error('not joined to this board');
        }
        const comment = createComment({
          cardId,
          content,
          authorName: socket.data.displayName || 'Guest',
        });
        io.to(boardRoom(boardId)).emit('comment_added', { comment });
        if (typeof ack === 'function') ack({ ok: true, comment });
      } catch (err) {
        if (typeof ack === 'function') ack({ error: err.message });
      }
    });
  });
}

module.exports = { registerSocketHandlers };
