const queries = require('./queries');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    // 5.2 Room-joining logic
    socket.on('join_board', (boardId) => {
      socket.join(`board:${boardId}`);
    });

    // 5.3 Handle add_card
    socket.on('add_card', ({ columnId, content, authorName }) => {
      const card = queries.createCard(columnId, content, authorName);
      const column = require('./db').prepare(
        'SELECT board_id FROM board_columns WHERE id = ?'
      ).get(columnId);
      if (column) {
        io.to(`board:${column.board_id}`).emit('card_added', card);
      }
    });

    // 5.4 Handle move_card
    socket.on('move_card', ({ cardId, newColumnId, newPosition }) => {
      const card = queries.moveCard(cardId, newColumnId, newPosition);
      if (card) {
        const column = require('./db').prepare(
          'SELECT board_id FROM board_columns WHERE id = ?'
        ).get(card.column_id);
        if (column) {
          io.to(`board:${column.board_id}`).emit('card_moved', {
            cardId: card.id,
            newColumnId: card.column_id,
            newPosition: card.position,
          });
        }
      }
    });

    // 5.5 Handle add_comment
    socket.on('add_comment', ({ cardId, content, authorName }) => {
      const comment = queries.createComment(cardId, content, authorName);
      const card = require('./db').prepare('SELECT column_id FROM cards WHERE id = ?').get(cardId);
      if (card) {
        const column = require('./db').prepare(
          'SELECT board_id FROM board_columns WHERE id = ?'
        ).get(card.column_id);
        if (column) {
          io.to(`board:${column.board_id}`).emit('comment_added', { ...comment, cardId });
        }
      }
    });
  });
}

module.exports = { setupSocketHandlers };
