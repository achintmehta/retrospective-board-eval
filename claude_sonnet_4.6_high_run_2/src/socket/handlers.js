const { randomUUID } = require('crypto');
const db = require('../db');

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('join_board', ({ boardId, displayName }) => {
      socket.join(boardId);
      socket.displayName = displayName;
      socket.boardId = boardId;
    });

    socket.on('add_card', ({ boardId, columnId, content, authorName }) => {
      const col = db.prepare(
        'SELECT id FROM board_columns WHERE id = ? AND board_id = ?'
      ).get(columnId, boardId);
      if (!col) return;

      const maxRow = db.prepare(
        'SELECT MAX(position) as pos FROM cards WHERE column_id = ?'
      ).get(columnId);
      const position = (maxRow.pos ?? -1) + 1;

      const id = randomUUID();
      db.prepare(
        'INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)'
      ).run(id, columnId, content, authorName, position);

      const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
      card.comments = [];

      io.to(boardId).emit('card_added', { card, columnId });
    });

    socket.on('move_card', ({ boardId, cardId, targetColumnId, targetPosition }) => {
      const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
      if (!card) return;

      db.prepare(
        'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
      ).run(targetColumnId, targetPosition, cardId);

      io.to(boardId).emit('card_moved', { cardId, targetColumnId, targetPosition });
    });

    socket.on('add_comment', ({ boardId, cardId, content, authorName }) => {
      const card = db.prepare('SELECT id FROM cards WHERE id = ?').get(cardId);
      if (!card) return;

      const id = randomUUID();
      db.prepare(
        'INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)'
      ).run(id, cardId, content, authorName);

      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
      io.to(boardId).emit('comment_added', { comment, cardId });
    });

    socket.on('add_column', ({ boardId, title }) => {
      const board = db.prepare('SELECT id FROM boards WHERE id = ?').get(boardId);
      if (!board) return;

      const maxRow = db.prepare(
        'SELECT MAX(position) as pos FROM board_columns WHERE board_id = ?'
      ).get(boardId);
      const position = (maxRow.pos ?? -1) + 1;

      const id = randomUUID();
      db.prepare(
        'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
      ).run(id, boardId, title, position);

      const column = db.prepare('SELECT * FROM board_columns WHERE id = ?').get(id);
      column.cards = [];
      io.to(boardId).emit('column_added', { column });
    });
  });
}

module.exports = { registerSocketHandlers };
