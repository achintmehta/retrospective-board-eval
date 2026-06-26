const db = require('./db');
const { v4: uuidv4 } = require('uuid');

const boards = {
  create(title) {
    const id = uuidv4();
    db.prepare('INSERT INTO boards (id, title) VALUES (?, ?)').run(id, title);
    return this.getById(id);
  },

  getAll() {
    return db.prepare('SELECT * FROM boards ORDER BY created_at DESC').all();
  },

  getById(id) {
    return db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
  },

  getFull(id) {
    const board = this.getById(id);
    if (!board) return null;

    const cols = db.prepare(
      'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC'
    ).all(id);

    for (const col of cols) {
      col.cards = db.prepare(
        'SELECT * FROM cards WHERE column_id = ? ORDER BY position ASC'
      ).all(col.id);

      for (const card of col.cards) {
        card.comments = db.prepare(
          'SELECT * FROM comments WHERE card_id = ? ORDER BY created_at ASC'
        ).all(card.id);
      }
    }

    board.columns = cols;
    return board;
  }
};

const columns = {
  create(boardId, title, position) {
    const id = uuidv4();
    if (position === undefined) {
      const max = db.prepare(
        'SELECT COALESCE(MAX(position), -1) as maxPos FROM board_columns WHERE board_id = ?'
      ).get(boardId);
      position = max.maxPos + 1;
    }
    db.prepare(
      'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
    ).run(id, boardId, title, position);
    return db.prepare('SELECT * FROM board_columns WHERE id = ?').get(id);
  }
};

const cards = {
  create(columnId, content, authorName) {
    const id = uuidv4();
    const max = db.prepare(
      'SELECT COALESCE(MAX(position), -1) as maxPos FROM cards WHERE column_id = ?'
    ).get(columnId);
    const position = max.maxPos + 1;
    db.prepare(
      'INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)'
    ).run(id, columnId, content, authorName, position);
    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
    card.comments = [];
    return card;
  },

  move(cardId, newColumnId, newPosition) {
    db.prepare(
      'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
    ).run(newColumnId, newPosition, cardId);
    return db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
  }
};

const comments = {
  create(cardId, content, authorName) {
    const id = uuidv4();
    db.prepare(
      'INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)'
    ).run(id, cardId, content, authorName);
    return db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
  }
};

const exportBoard = {
  toCSV(boardId) {
    const board = boards.getFull(boardId);
    if (!board) return null;

    const rows = [['Column', 'Card', 'Author', 'Created At', 'Comment', 'Comment Author', 'Comment Time']];

    for (const col of board.columns) {
      for (const card of col.cards) {
        if (card.comments.length === 0) {
          rows.push([col.title, card.content, card.author_name, card.created_at, '', '', '']);
        } else {
          for (const comment of card.comments) {
            rows.push([
              col.title, card.content, card.author_name, card.created_at,
              comment.content, comment.author_name, comment.created_at
            ]);
          }
        }
      }
    }

    return rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }
};

module.exports = { boards, columns, cards, comments, exportBoard };
