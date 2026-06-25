const { createCard, moveCard, createComment } = require('./db');

function setupSocketHandlers(io, db) {
  io.on('connection', (socket) => {
    socket.on('join_board', (boardId) => {
      socket.join(`board:${boardId}`);
    });

    socket.on('add_card', (data) => {
      const { columnId, content, authorName } = data;
      const card = createCard(db, columnId, content, authorName);
      io.to(`board:${data.boardId}`).emit('card_added', card);
    });

    socket.on('move_card', (data) => {
      const { cardId, targetColumnId, targetPosition, boardId } = data;
      const card = moveCard(db, cardId, targetColumnId, targetPosition);
      if (card) {
        io.to(`board:${boardId}`).emit('card_moved', {
          cardId,
          targetColumnId,
          targetPosition
        });
      }
    });

    socket.on('add_comment', (data) => {
      const { cardId, content, authorName, boardId } = data;
      const comment = createComment(db, cardId, content, authorName);
      io.to(`board:${boardId}`).emit('comment_added', { cardId, comment });
    });
  });
}

module.exports = { setupSocketHandlers };
