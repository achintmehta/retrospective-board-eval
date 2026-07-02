const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'retro.sqlite');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDb() {
  const conn = getDb();

  conn.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS board_columns (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      column_id TEXT NOT NULL,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      position INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (column_id) REFERENCES board_columns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    );
  `);
}

// --- Board queries ---

function createBoard(id, title) {
  const conn = getDb();
  conn.prepare('INSERT INTO boards (id, title) VALUES (?, ?)').run(id, title);
  return conn.prepare('SELECT * FROM boards WHERE id = ?').get(id);
}

function getAllBoards() {
  return getDb().prepare('SELECT * FROM boards ORDER BY created_at DESC').all();
}

function getBoardById(id) {
  return getDb().prepare('SELECT * FROM boards WHERE id = ?').get(id);
}

// --- Column queries ---

function createColumn(id, boardId, title, position) {
  const conn = getDb();
  conn.prepare('INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)').run(id, boardId, title, position);
  return conn.prepare('SELECT * FROM board_columns WHERE id = ?').get(id);
}

function getColumnsByBoard(boardId) {
  return getDb().prepare('SELECT * FROM board_columns WHERE board_id = ? ORDER BY position').all(boardId);
}

// --- Card queries ---

function createCard(id, columnId, content, authorName, position) {
  const conn = getDb();
  conn.prepare('INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)').run(id, columnId, content, authorName, position);
  return conn.prepare('SELECT * FROM cards WHERE id = ?').get(id);
}

function getCardsByColumn(columnId) {
  return getDb().prepare('SELECT * FROM cards WHERE column_id = ? ORDER BY position').all(columnId);
}

function moveCard(cardId, newColumnId, newPosition) {
  const conn = getDb();
  conn.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?').run(newColumnId, newPosition, cardId);
  return conn.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
}

function getNextCardPosition(columnId) {
  const row = getDb().prepare('SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM cards WHERE column_id = ?').get(columnId);
  return row.next_pos;
}

// --- Comment queries ---

function createComment(id, cardId, content, authorName) {
  const conn = getDb();
  conn.prepare('INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)').run(id, cardId, content, authorName);
  return conn.prepare('SELECT * FROM comments WHERE id = ?').get(id);
}

function getCommentsByCard(cardId) {
  return getDb().prepare('SELECT * FROM comments WHERE card_id = ? ORDER BY created_at').all(cardId);
}

// --- Full board fetch ---

function getFullBoard(boardId) {
  const board = getBoardById(boardId);
  if (!board) return null;

  const columns = getColumnsByBoard(boardId).map((col) => {
    const cards = getCardsByColumn(col.id).map((card) => ({
      ...card,
      comments: getCommentsByCard(card.id),
    }));
    return { ...col, cards };
  });

  return { ...board, columns };
}

module.exports = {
  initDb,
  getDb,
  createBoard,
  getAllBoards,
  getBoardById,
  createColumn,
  getColumnsByBoard,
  createCard,
  getCardsByColumn,
  moveCard,
  getNextCardPosition,
  createComment,
  getCommentsByCard,
  getFullBoard,
};
