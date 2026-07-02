const { v4: uuidv4 } = require('uuid');
const { createCard, moveCard, createComment, createColumn, getColumnsByBoard } = require('./db');

function setupSocket(io) {
  io.on('connection', (socket) => {
    socket.on('join_board', (boardId) => {
      socket.join(boardId);
      socket.boardId = boardId;
    });

    socket.on('add_card', ({ columnId, content, authorName }) => {
      if (!columnId || !content || !authorName) return;
      const id = uuidv4();
      const card = createCard(id, columnId, content, authorName, Date.now());
      io.to(socket.boardId).emit('card_added', card);
    });

    socket.on('move_card', ({ cardId, newColumnId, newPosition }) => {
      if (!cardId || !newColumnId || newPosition == null) return;
      moveCard(cardId, newColumnId, newPosition);
      io.to(socket.boardId).emit('card_moved', { cardId, newColumnId, newPosition });
    });

    socket.on('add_comment', ({ cardId, content, authorName }) => {
      if (!cardId || !content || !authorName) return;
      const id = uuidv4();
      const comment = createComment(id, cardId, content, authorName);
      io.to(socket.boardId).emit('comment_added', comment);
    });

    socket.on('add_column', ({ boardId, title }) => {
      if (!boardId || !title) return;
      const existing = getColumnsByBoard(boardId);
      const id = uuidv4();
      const column = createColumn(id, boardId, title, existing.length);
      io.to(boardId).emit('column_added', column);
    });
  });
}

module.exports = { setupSocket };
