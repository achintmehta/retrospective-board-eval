const { createCard, moveCard, createComment, createColumn } = require('./queries');

function initSocket(io) {
  io.on('connection', (socket) => {
    socket.on('join_board', (boardId) => {
      socket.join(boardId);
    });

    socket.on('leave_board', (boardId) => {
      socket.leave(boardId);
    });

    socket.on('add_column', async ({ boardId, title }) => {
      try {
        const column = await createColumn(boardId, title);
        column.cards = [];
        io.to(boardId).emit('column_added', { column });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('add_card', async ({ boardId, columnId, content, authorName }) => {
      try {
        const card = await createCard(columnId, content, authorName);
        card.comments = [];
        io.to(boardId).emit('card_added', { card, columnId });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('move_card', async ({ boardId, cardId, newColumnId, newPosition }) => {
      try {
        const card = await moveCard(cardId, newColumnId, newPosition);
        io.to(boardId).emit('card_moved', { card, newColumnId, newPosition });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('add_comment', async ({ boardId, cardId, content, authorName }) => {
      try {
        const comment = await createComment(cardId, content, authorName);
        io.to(boardId).emit('comment_added', { comment, cardId });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });
  });
}

module.exports = { initSocket };
