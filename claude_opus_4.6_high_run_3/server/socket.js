const { createCard, moveCard, createComment } = require('./db');

function setupSocket(io, db) {
  io.on('connection', (socket) => {
    socket.on('join_board', (boardId) => {
      socket.join(`board:${boardId}`);
    });

    socket.on('leave_board', (boardId) => {
      socket.leave(`board:${boardId}`);
    });

    socket.on('add_card', ({ columnId, content, authorName, boardId }) => {
      const card = createCard(db, columnId, content, authorName);
      io.to(`board:${boardId}`).emit('card_added', card);
    });

    socket.on('move_card', ({ cardId, targetColumnId, targetPosition, boardId }) => {
      const card = moveCard(db, cardId, targetColumnId, targetPosition);
      if (card) {
        io.to(`board:${boardId}`).emit('card_moved', {
          cardId,
          targetColumnId,
          targetPosition
        });
      }
    });

    socket.on('add_comment', ({ cardId, content, authorName, boardId }) => {
      const comment = createComment(db, cardId, content, authorName);
      io.to(`board:${boardId}`).emit('comment_added', { ...comment, cardId });
    });
  });
}

module.exports = { setupSocket };
