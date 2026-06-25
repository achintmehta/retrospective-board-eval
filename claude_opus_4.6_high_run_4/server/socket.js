const { createCard, moveCard, createComment, getBoardIdForColumn, getBoardIdForCard } = require('./db');

function setupSocket(io, db) {
  io.on('connection', (socket) => {
    socket.on('join_board', (boardId) => {
      socket.join(`board:${boardId}`);
    });

    socket.on('leave_board', (boardId) => {
      socket.leave(`board:${boardId}`);
    });

    socket.on('add_card', ({ columnId, content, authorName }) => {
      const card = createCard(db, columnId, content, authorName);
      const boardId = getBoardIdForColumn(db, columnId);
      if (boardId) {
        io.to(`board:${boardId}`).emit('card_added', { columnId, card });
      }
    });

    socket.on('move_card', ({ cardId, targetColumnId, targetPosition }) => {
      const boardId = getBoardIdForCard(db, cardId);
      const card = moveCard(db, cardId, targetColumnId, targetPosition);
      if (boardId) {
        io.to(`board:${boardId}`).emit('card_moved', { card, targetColumnId, targetPosition });
      }
    });

    socket.on('add_comment', ({ cardId, content, authorName }) => {
      const comment = createComment(db, cardId, content, authorName);
      const boardId = getBoardIdForCard(db, cardId);
      if (boardId) {
        io.to(`board:${boardId}`).emit('comment_added', { cardId, comment });
      }
    });
  });
}

module.exports = { setupSocket };
