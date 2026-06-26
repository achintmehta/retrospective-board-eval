const { Server } = require('socket.io');
const {
  createCard,
  getMaxCardPosition,
  moveCard,
  createComment,
  getCardById,
  getCommentById,
} = require('./db');

function setupSocket(server) {
  const io = new Server(server, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    socket.on('join_board', ({ boardId, displayName }) => {
      socket.join(`board:${boardId}`);
      socket.data.boardId = boardId;
      socket.data.displayName = displayName;
    });

    socket.on('add_card', ({ boardId, columnId, content, authorName }) => {
      const { max_pos } = getMaxCardPosition.get(columnId);
      const result = createCard.run(columnId, content, authorName, max_pos + 1);
      const card = getCardById.get(result.lastInsertRowid);
      io.to(`board:${boardId}`).emit('card_added', card);
    });

    socket.on('move_card', ({ cardId, fromColumnId, toColumnId, newPosition }) => {
      moveCard.run(toColumnId, newPosition, cardId);
      const boardId = socket.data.boardId;
      io.to(`board:${boardId}`).emit('card_moved', {
        cardId,
        fromColumnId,
        toColumnId,
        newPosition,
      });
    });

    socket.on('add_comment', ({ cardId, content, authorName }) => {
      const result = createComment.run(cardId, content, authorName);
      const comment = getCommentById.get(result.lastInsertRowid);
      const boardId = socket.data.boardId;
      io.to(`board:${boardId}`).emit('comment_added', comment);
    });

    socket.on('add_column', ({ boardId, column }) => {
      socket.to(`board:${boardId}`).emit('column_added', column);
    });
  });

  return io;
}

module.exports = { setupSocket };
