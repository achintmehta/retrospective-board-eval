const { createCard, moveCard, createComment, getCardCountInColumn } = require('./db');

function setupSocketHandlers(io, db) {
  io.on('connection', (socket) => {
    socket.on('join_board', (boardId) => {
      socket.join(`board:${boardId}`);
    });

    socket.on('add_card', ({ boardId, columnId, content, authorName }) => {
      const position = getCardCountInColumn(db, columnId);
      const card = createCard(db, columnId, content, authorName, position);
      io.to(`board:${boardId}`).emit('card_added', card);
    });

    socket.on('move_card', ({ boardId, cardId, newColumnId, newPosition }) => {
      moveCard(db, cardId, newColumnId, newPosition);
      io.to(`board:${boardId}`).emit('card_moved', { cardId, newColumnId, newPosition });
    });

    socket.on('add_comment', ({ boardId, cardId, content, authorName }) => {
      const comment = createComment(db, cardId, content, authorName);
      io.to(`board:${boardId}`).emit('comment_added', comment);
    });
  });
}

module.exports = { setupSocketHandlers };
