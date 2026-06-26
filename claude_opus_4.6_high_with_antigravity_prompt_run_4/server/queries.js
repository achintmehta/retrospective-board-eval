const db = require('./db');
const crypto = require('crypto');
const generateId = () => crypto.randomUUID();

const boards = {
  create(title) {
    const id = generateId();
    db.prepare('INSERT INTO boards (id, title) VALUES (?, ?)').run(String(id), String(title));
    return db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
  },

  getAll() {
    return db.prepare('SELECT * FROM boards ORDER BY created_at DESC').all();
  },

  getById(id) {
    return db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
  },

  getFull(id) {
    const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
    if (!board) return null;

    const columns = db.prepare(
      'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position'
    ).all(id);

    for (const col of columns) {
      col.cards = db.prepare(
        'SELECT * FROM cards WHERE column_id = ? ORDER BY position'
      ).all(col.id);

      for (const card of col.cards) {
        card.comments = db.prepare(
          'SELECT * FROM comments WHERE card_id = ? ORDER BY created_at'
        ).all(card.id);
      }
    }

    board.columns = columns;
    return board;
  },
};

const columns = {
  create(boardId, title, position) {
    const id = generateId();
    db.prepare(
      'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
    ).run(String(id), String(boardId), String(title), Number(position));
    return db.prepare('SELECT * FROM board_columns WHERE id = ?').get(id);
  },

  getByBoard(boardId) {
    return db.prepare(
      'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position'
    ).all(boardId);
  },
};

const cards = {
  create(columnId, content, authorName) {
    const id = generateId();
    const maxPos = db.prepare(
      'SELECT COALESCE(MAX(position), -1) as max FROM cards WHERE column_id = ?'
    ).get(String(columnId));
    const position = Number((maxPos?.max ?? -1)) + 1;

    db.prepare(
      'INSERT INTO cards (id, column_id, content, author_name, position) VALUES (@id, @column_id, @content, @author_name, @position)'
    ).run({
      id: String(id),
      column_id: String(columnId),
      content: String(content),
      author_name: String(authorName),
      position: position,
    });
    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
    card.comments = [];
    return card;
  },

  move(cardId, newColumnId, newPosition) {
    db.prepare(
      'UPDATE cards SET column_id = @column_id, position = @position WHERE id = @id'
    ).run({
      column_id: String(newColumnId),
      position: Number(newPosition),
      id: String(cardId),
    });
    return db.prepare('SELECT * FROM cards WHERE id = ?').get(String(cardId));
  },

  getById(id) {
    return db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
  },
};

const comments = {
  create(cardId, content, authorName) {
    const id = generateId();
    db.prepare(
      'INSERT INTO comments (id, card_id, content, author_name) VALUES (@id, @card_id, @content, @author_name)'
    ).run({
      id: String(id),
      card_id: String(cardId),
      content: String(content),
      author_name: String(authorName),
    });
    return db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
  },
};

module.exports = { boards, columns, cards, comments };
