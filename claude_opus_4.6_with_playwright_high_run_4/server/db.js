const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'retro.sqlite');
const fs = require('fs');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

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

const queries = {
  createBoard: db.prepare('INSERT INTO boards (title) VALUES (?)'),
  getAllBoards: db.prepare('SELECT * FROM boards ORDER BY created_at DESC'),
  getBoardById: db.prepare('SELECT * FROM boards WHERE id = ?'),
  getColumnsByBoardId: db.prepare('SELECT * FROM board_columns WHERE board_id = ? ORDER BY position'),
  createColumn: db.prepare('INSERT INTO board_columns (board_id, title, position) VALUES (?, ?, ?)'),
  getCardsByColumnId: db.prepare('SELECT * FROM cards WHERE column_id = ? ORDER BY position'),
  createCard: db.prepare('INSERT INTO cards (column_id, content, author_name, position) VALUES (?, ?, ?, ?)'),
  moveCard: db.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?'),
  getCardById: db.prepare('SELECT * FROM cards WHERE id = ?'),
  getCommentsByCardId: db.prepare('SELECT * FROM comments WHERE card_id = ? ORDER BY created_at'),
  createComment: db.prepare('INSERT INTO comments (card_id, content, author_name) VALUES (?, ?, ?)'),
  getCommentById: db.prepare('SELECT * FROM comments WHERE id = ?'),
  getMaxColumnPosition: db.prepare('SELECT COALESCE(MAX(position), -1) as maxPos FROM board_columns WHERE board_id = ?'),
  getMaxCardPosition: db.prepare('SELECT COALESCE(MAX(position), -1) as maxPos FROM cards WHERE column_id = ?'),
  getAllCardsByBoardId: db.prepare(`
    SELECT c.*, bc.title as column_title
    FROM cards c
    JOIN board_columns bc ON c.column_id = bc.id
    WHERE bc.board_id = ?
    ORDER BY bc.position, c.position
  `),
  getAllCommentsByBoardId: db.prepare(`
    SELECT cm.*, c.id as parent_card_id
    FROM comments cm
    JOIN cards c ON cm.card_id = c.id
    JOIN board_columns bc ON c.column_id = bc.id
    WHERE bc.board_id = ?
    ORDER BY cm.created_at
  `),
};

module.exports = { db, queries };
