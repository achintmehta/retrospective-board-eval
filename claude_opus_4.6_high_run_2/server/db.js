const Database = require('better-sqlite3');
const path = require('path');

function initializeDatabase() {
  const dataDir = path.join(__dirname, '..', 'data');
  const fs = require('fs');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'retro.sqlite');
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
      created_at TEXT DEFAULT (datetime('now')),
      position INTEGER NOT NULL DEFAULT 0,
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
  const stmt = db.prepare('INSERT INTO boards (title) VALUES (?)');
  const result = stmt.run(title);
  return { id: result.lastInsertRowid, title };
}

function getAllBoards(db) {
  return db.prepare('SELECT * FROM boards ORDER BY created_at DESC').all();
}

function getBoardById(db, boardId) {
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(boardId);
  if (!board) return null;

  const columns = db.prepare(
    'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position'
  ).all(boardId);

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

function createColumn(db, boardId, title, position) {
  const stmt = db.prepare(
    'INSERT INTO board_columns (board_id, title, position) VALUES (?, ?, ?)'
  );
  const result = stmt.run(boardId, title, position);
  return { id: result.lastInsertRowid, board_id: boardId, title, position };
}

function createCard(db, columnId, content, authorName, position) {
  const stmt = db.prepare(
    'INSERT INTO cards (column_id, content, author_name, position) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(columnId, content, authorName, position);
  return db.prepare('SELECT * FROM cards WHERE id = ?').get(result.lastInsertRowid);
}

function moveCard(db, cardId, newColumnId, newPosition) {
  const stmt = db.prepare(
    'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
  );
  stmt.run(newColumnId, newPosition, cardId);
  return db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
}

function createComment(db, cardId, content, authorName) {
  const stmt = db.prepare(
    'INSERT INTO comments (card_id, content, author_name) VALUES (?, ?, ?)'
  );
  const result = stmt.run(cardId, content, authorName);
  return db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
}

function getCardCountInColumn(db, columnId) {
  const row = db.prepare('SELECT COUNT(*) as count FROM cards WHERE column_id = ?').get(columnId);
  return row.count;
}

function getColumnCountInBoard(db, boardId) {
  const row = db.prepare('SELECT COUNT(*) as count FROM board_columns WHERE board_id = ?').get(boardId);
  return row.count;
}

module.exports = {
  initializeDatabase,
  createBoard,
  getAllBoards,
  getBoardById,
  createColumn,
  createCard,
  moveCard,
  createComment,
  getCardCountInColumn,
  getColumnCountInBoard
};
