const { queries } = require('./db');

function setupSocket(io) {
  io.on('connection', (socket) => {
    socket.on('join_board', (boardId) => {
      socket.join(`board:${boardId}`);
    });

    socket.on('leave_board', (boardId) => {
      socket.leave(`board:${boardId}`);
    });

    socket.on('add_card', ({ columnId, content, authorName, boardId }) => {
      const { max_pos } = queries.getMaxCardPosition.get(columnId);
      const result = queries.createCard.run(columnId, content, authorName, max_pos + 1);
      const card = {
        id: Number(result.lastInsertRowid),
        column_id: columnId,
        content,
        author_name: authorName,
        position: max_pos + 1,
        created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
        comments: [],
      };
      io.to(`board:${boardId}`).emit('card_added', card);
    });

    socket.on('move_card', ({ cardId, targetColumnId, position, boardId }) => {
      queries.moveCard.run(targetColumnId, position, cardId);
      io.to(`board:${boardId}`).emit('card_moved', { cardId, targetColumnId, position });
    });

    socket.on('add_comment', ({ cardId, content, authorName, boardId }) => {
      const result = queries.createComment.run(cardId, content, authorName);
      const comment = {
        id: Number(result.lastInsertRowid),
        card_id: cardId,
        content,
        author_name: authorName,
        created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      };
      io.to(`board:${boardId}`).emit('comment_added', comment);
    });

    socket.on('add_column', ({ boardId, title }) => {
      const { max_pos } = queries.getMaxColumnPosition.get(boardId);
      const result = queries.createColumn.run(boardId, title, max_pos + 1);
      const column = {
        id: Number(result.lastInsertRowid),
        board_id: Number(boardId),
        title,
        position: max_pos + 1,
        cards: [],
      };
      io.to(`board:${boardId}`).emit('column_added', column);
    });
  });
}

module.exports = { setupSocket };
