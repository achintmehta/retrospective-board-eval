const { v4: uuidv4 } = require('uuid');
const { createCard, moveCard, createComment, getNextCardPosition } = require('./db');

function setupSocket(io) {
  io.on('connection', (socket) => {
    socket.on('join_board', (boardId) => {
      socket.join(boardId);
    });

    socket.on('add_card', ({ boardId, columnId, content, authorName }) => {
      const position = getNextCardPosition(columnId);
      const card = createCard(uuidv4(), columnId, content, authorName, position);
      io.to(boardId).emit('card_added', { ...card, comments: [] });
    });

    socket.on('move_card', ({ boardId, cardId, newColumnId, newPosition }) => {
      const card = moveCard(cardId, newColumnId, newPosition);
      io.to(boardId).emit('card_moved', card);
    });

    socket.on('add_comment', ({ boardId, cardId, content, authorName }) => {
      const comment = createComment(uuidv4(), cardId, content, authorName);
      io.to(boardId).emit('comment_added', { cardId, comment });
    });
  });
}

module.exports = { setupSocket };
