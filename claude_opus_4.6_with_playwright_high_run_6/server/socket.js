const { createCard, moveCard, createComment, createColumn } = require('./queries');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('join_board', (boardId) => {
      socket.join(boardId);
    });

    socket.on('leave_board', (boardId) => {
      socket.leave(boardId);
    });

    socket.on('add_card', ({ boardId, columnId, content, authorName }) => {
      const card = createCard(columnId, content, authorName);
      io.to(boardId).emit('card_added', { columnId, card });
    });

    socket.on('move_card', ({ boardId, cardId, targetColumnId, targetPosition }) => {
      const card = moveCard(cardId, targetColumnId, targetPosition);
      if (card) {
        io.to(boardId).emit('card_moved', { cardId, targetColumnId, targetPosition });
      }
    });

    socket.on('add_comment', ({ boardId, cardId, content, authorName }) => {
      const comment = createComment(cardId, content, authorName);
      io.to(boardId).emit('comment_added', { cardId, comment });
    });

    socket.on('add_column', ({ boardId, title }) => {
      const column = createColumn(boardId, title);
      io.to(boardId).emit('column_added', { column });
    });
  });
}

module.exports = { setupSocketHandlers };
