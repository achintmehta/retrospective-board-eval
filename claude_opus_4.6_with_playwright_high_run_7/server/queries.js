const db = require('./db');

const boards = {
  create(title) {
    const stmt = db.prepare('INSERT INTO boards (title) VALUES (?)');
    const result = stmt.run(title);
    return this.getById(result.lastInsertRowid);
  },

  getAll() {
    return db.prepare('SELECT * FROM boards ORDER BY created_at DESC').all();
  },

  getById(id) {
    return db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
  },

  getFullBoard(id) {
    const board = this.getById(id);
    if (!board) return null;

    const cols = db.prepare(
      'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position'
    ).all(id);

    for (const col of cols) {
      col.cards = db.prepare(
        'SELECT * FROM cards WHERE column_id = ? ORDER BY position'
      ).all(col.id);

      for (const card of col.cards) {
        card.comments = db.prepare(
          'SELECT * FROM comments WHERE card_id = ? ORDER BY created_at'
        ).all(card.id);
      }
    }

    board.columns = cols;
    return board;
  }
};

const columns = {
  create(boardId, title) {
    const maxPos = db.prepare(
      'SELECT COALESCE(MAX(position), -1) as max FROM board_columns WHERE board_id = ?'
    ).get(boardId);
    const position = maxPos.max + 1;
    const stmt = db.prepare(
      'INSERT INTO board_columns (board_id, title, position) VALUES (?, ?, ?)'
    );
    const result = stmt.run(boardId, title, position);
    return db.prepare('SELECT * FROM board_columns WHERE id = ?').get(result.lastInsertRowid);
  }
};

const cards = {
  create(columnId, content, authorName) {
    const maxPos = db.prepare(
      'SELECT COALESCE(MAX(position), -1) as max FROM cards WHERE column_id = ?'
    ).get(columnId);
    const position = maxPos.max + 1;
    const stmt = db.prepare(
      'INSERT INTO cards (column_id, content, author_name, position) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(columnId, content, authorName, position);
    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(result.lastInsertRowid);
    card.comments = [];
    return card;
  },

  move(cardId, newColumnId, newPosition) {
    const stmt = db.prepare(
      'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
    );
    stmt.run(newColumnId, newPosition, cardId);
    return db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
  }
};

const comments = {
  create(cardId, content, authorName) {
    const stmt = db.prepare(
      'INSERT INTO comments (card_id, content, author_name) VALUES (?, ?, ?)'
    );
    const result = stmt.run(cardId, content, authorName);
    return db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
  }
};

module.exports = { boards, columns, cards, comments };
