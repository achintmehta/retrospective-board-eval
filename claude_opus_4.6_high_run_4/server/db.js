const Database = require('better-sqlite3');
const path = require('path');

function initDb() {
  const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'retro.sqlite');
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS board_columns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      column_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (column_id) REFERENCES board_columns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    );
  `);

  return db;
}

function createBoard(db, title) {
  const result = db.prepare('INSERT INTO boards (title) VALUES (?)').run(title);
  return db.prepare('SELECT * FROM boards WHERE id = ?').get(result.lastInsertRowid);
}

function getAllBoards(db) {
  return db.prepare('SELECT * FROM boards ORDER BY created_at DESC').all();
}

function getBoardById(db, id) {
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
}

function createColumn(db, boardId, title) {
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) as max FROM board_columns WHERE board_id = ?'
  ).get(boardId);
  const position = maxPos.max + 1;
  const result = db.prepare(
    'INSERT INTO board_columns (board_id, title, position) VALUES (?, ?, ?)'
  ).run(boardId, title, position);
  return db.prepare('SELECT * FROM board_columns WHERE id = ?').get(result.lastInsertRowid);
}

function createCard(db, columnId, content, authorName) {
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) as max FROM cards WHERE column_id = ?'
  ).get(columnId);
  const position = maxPos.max + 1;
  const result = db.prepare(
    'INSERT INTO cards (column_id, content, author_name, position) VALUES (?, ?, ?, ?)'
  ).run(columnId, content, authorName, position);
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(result.lastInsertRowid);
  card.comments = [];
  return card;
}

function moveCard(db, cardId, targetColumnId, targetPosition) {
  db.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?')
    .run(targetColumnId, targetPosition, cardId);
  return db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
}

function createComment(db, cardId, content, authorName) {
  const result = db.prepare(
    'INSERT INTO comments (card_id, content, author_name) VALUES (?, ?, ?)'
  ).run(cardId, content, authorName);
  return db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
}

function getBoardIdForColumn(db, columnId) {
  const col = db.prepare('SELECT board_id FROM board_columns WHERE id = ?').get(columnId);
  return col ? col.board_id : null;
}

function getBoardIdForCard(db, cardId) {
  const row = db.prepare(
    'SELECT bc.board_id FROM cards c JOIN board_columns bc ON c.column_id = bc.id WHERE c.id = ?'
  ).get(cardId);
  return row ? row.board_id : null;
}

module.exports = {
  initDb,
  createBoard,
  getAllBoards,
  getBoardById,
  createColumn,
  createCard,
  moveCard,
  createComment,
  getBoardIdForColumn,
  getBoardIdForCard,
};
