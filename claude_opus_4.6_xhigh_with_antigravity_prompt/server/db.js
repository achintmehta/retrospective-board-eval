const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'retro.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (column_id) REFERENCES board_columns(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
  );
`);

const queries = {
  createBoard: db.prepare('INSERT INTO boards (title) VALUES (?)'),
  getAllBoards: db.prepare('SELECT * FROM boards ORDER BY created_at DESC'),
  getBoardById: db.prepare('SELECT * FROM boards WHERE id = ?'),

  createColumn: db.prepare('INSERT INTO board_columns (board_id, title, position) VALUES (?, ?, ?)'),
  getColumnsByBoard: db.prepare('SELECT * FROM board_columns WHERE board_id = ? ORDER BY position'),
  getMaxColumnPosition: db.prepare('SELECT COALESCE(MAX(position), -1) as max_pos FROM board_columns WHERE board_id = ?'),

  createCard: db.prepare('INSERT INTO cards (column_id, content, author_name, position) VALUES (?, ?, ?, ?)'),
  getCardsByColumn: db.prepare('SELECT * FROM cards WHERE column_id = ? ORDER BY position'),
  getMaxCardPosition: db.prepare('SELECT COALESCE(MAX(position), -1) as max_pos FROM cards WHERE column_id = ?'),
  moveCard: db.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?'),

  createComment: db.prepare('INSERT INTO comments (card_id, content, author_name) VALUES (?, ?, ?)'),
  getCommentsByCard: db.prepare('SELECT * FROM comments WHERE card_id = ? ORDER BY created_at ASC'),

  getCardsByBoardColumns: db.prepare(`
    SELECT c.* FROM cards c
    JOIN board_columns bc ON c.column_id = bc.id
    WHERE bc.board_id = ?
    ORDER BY c.position
  `),
  getCommentsByBoard: db.prepare(`
    SELECT cm.* FROM comments cm
    JOIN cards c ON cm.card_id = c.id
    JOIN board_columns bc ON c.column_id = bc.id
    WHERE bc.board_id = ?
    ORDER BY cm.created_at ASC
  `),
};

module.exports = { db, queries };
