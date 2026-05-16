const { randomUUID } = require('crypto');
const db = require('./db');

function initSocket(io) {
  io.on('connection', (socket) => {
    // join_board: client joins a board room
    socket.on('join_board', ({ boardId }) => {
      socket.join(`board:${boardId}`);
    });

    // add_card: { boardId, columnId, content, authorName }
    socket.on('add_card', ({ boardId, columnId, content, authorName }) => {
      if (!columnId || !content || !authorName) return;
      const position = db.getNextCardPosition(columnId);
      const card = db.createCard(randomUUID(), columnId, content.trim(), authorName, position);
      card.comments = [];
      io.to(`board:${boardId}`).emit('card_added', { columnId, card });
    });

    // move_card: { boardId, cardId, targetColumnId, position }
    socket.on('move_card', ({ boardId, cardId, targetColumnId, position }) => {
      if (!cardId || !targetColumnId) return;
      const pos = typeof position === 'number' ? position : 0;
      const card = db.moveCard(cardId, targetColumnId, pos);
      io.to(`board:${boardId}`).emit('card_moved', { cardId, targetColumnId, position: pos, card });
    });

    // add_comment: { boardId, cardId, content, authorName }
    socket.on('add_comment', ({ boardId, cardId, content, authorName }) => {
      if (!cardId || !content || !authorName) return;
      const comment = db.createComment(randomUUID(), cardId, content.trim(), authorName);
      io.to(`board:${boardId}`).emit('comment_added', { cardId, comment });
    });
  });
}

module.exports = { initSocket };
