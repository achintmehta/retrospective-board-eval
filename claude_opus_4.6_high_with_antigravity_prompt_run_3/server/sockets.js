const {
  createCard, getMaxCardPosition, getCardById,
  moveCard, getCardById: getCard,
  createComment, getCommentById
} = require('./db');

module.exports = function (io) {
  io.on('connection', (socket) => {
    socket.on('join_board', (boardId) => {
      socket.join(`board:${boardId}`);
    });

    socket.on('leave_board', (boardId) => {
      socket.leave(`board:${boardId}`);
    });

    socket.on('add_card', (data) => {
      const { column_id, content, author_name, board_id } = data;
      if (!column_id || !content || !author_name) return;

      const { max_pos } = getMaxCardPosition.get(column_id);
      const result = createCard.run(column_id, content.trim(), author_name, max_pos + 1);
      const card = getCardById.get(result.lastInsertRowid);
      card.comments = [];

      io.to(`board:${board_id}`).emit('card_added', {
        column_id,
        card
      });
    });

    socket.on('move_card', (data) => {
      const { card_id, target_column_id, board_id } = data;
      if (!card_id || !target_column_id) return;

      const { max_pos } = getMaxCardPosition.get(target_column_id);
      moveCard.run(target_column_id, max_pos + 1, card_id);
      const card = getCardById.get(card_id);

      io.to(`board:${board_id}`).emit('card_moved', {
        card_id,
        source_column_id: data.source_column_id,
        target_column_id,
        card
      });
    });

    socket.on('add_comment', (data) => {
      const { card_id, content, author_name, board_id } = data;
      if (!card_id || !content || !author_name) return;

      const result = createComment.run(card_id, content.trim(), author_name);
      const comment = getCommentById.get(result.lastInsertRowid);

      io.to(`board:${board_id}`).emit('comment_added', {
        card_id,
        comment
      });
    });
  });
};
