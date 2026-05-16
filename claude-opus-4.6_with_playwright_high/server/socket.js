const { Server } = require('socket.io');
const queries = require('./queries');

function initializeSocket(server) {
  const io = new Server(server, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    socket.on('join_board', (boardId) => {
      socket.join(boardId);
    });

    socket.on('add_card', ({ columnId, content, authorName, boardId }) => {
      const card = queries.createCard(columnId, content, authorName);
      io.to(boardId).emit('card_added', { columnId, card });
    });

    socket.on('move_card', ({ cardId, targetColumnId, targetPosition, boardId, sourceColumnId }) => {
      const card = queries.moveCard(cardId, targetColumnId, targetPosition);
      io.to(boardId).emit('card_moved', { cardId, sourceColumnId, targetColumnId, targetPosition, card });
    });

    socket.on('add_comment', ({ cardId, content, authorName, boardId, columnId }) => {
      const comment = queries.createComment(cardId, content, authorName);
      io.to(boardId).emit('comment_added', { cardId, columnId, comment });
    });
  });

  return io;
}

module.exports = { initializeSocket };
