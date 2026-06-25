const queries = require('./queries');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    // 5.2 Room-joining logic
    socket.on('join_board', (boardId) => {
      socket.join(`board:${boardId}`);
    });

    socket.on('leave_board', (boardId) => {
      socket.leave(`board:${boardId}`);
    });

    // 5.3 Handle add_card
    socket.on('add_card', ({ columnId, content, authorName }) => {
      const card = queries.createCard(columnId, content, authorName);
      const col = require('./db').prepare(
        'SELECT board_id FROM board_columns WHERE id = ?'
      ).get(columnId);
      if (col) {
        card.comments = [];
        io.to(`board:${col.board_id}`).emit('card_added', card);
      }
    });

    // 5.4 Handle move_card
    socket.on('move_card', ({ cardId, newColumnId, newPosition }) => {
      const card = queries.moveCard(cardId, newColumnId, newPosition);
      const col = require('./db').prepare(
        'SELECT board_id FROM board_columns WHERE id = ?'
      ).get(card.column_id);
      if (col) {
        io.to(`board:${col.board_id}`).emit('card_moved', card);
      }
    });

    // 5.5 Handle add_comment
    socket.on('add_comment', ({ cardId, content, authorName }) => {
      const comment = queries.createComment(cardId, content, authorName);
      const card = queries.getCard(cardId);
      if (card) {
        const col = require('./db').prepare(
          'SELECT board_id FROM board_columns WHERE id = ?'
        ).get(card.column_id);
        if (col) {
          io.to(`board:${col.board_id}`).emit('comment_added', {
            ...comment,
            cardId
          });
        }
      }
    });
  });
}

module.exports = { setupSocketHandlers };
