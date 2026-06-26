const Database = require('better-sqlite3');
const path = require('path');

const fs = require('fs');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const DB_PATH = process.env.DB_PATH || path.join(dataDir, 'retro.sqlite');
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

// --- Board queries ---

const createBoard = db.prepare(
  'INSERT INTO boards (title) VALUES (?)'
);

const getAllBoards = db.prepare(
  'SELECT * FROM boards ORDER BY created_at DESC'
);

const getBoardById = db.prepare(
  'SELECT * FROM boards WHERE id = ?'
);

// --- Column queries ---

const createColumn = db.prepare(
  'INSERT INTO board_columns (board_id, title, position) VALUES (?, ?, ?)'
);

const getColumnsByBoard = db.prepare(
  'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position'
);

const getMaxColumnPosition = db.prepare(
  'SELECT COALESCE(MAX(position), -1) as max_pos FROM board_columns WHERE board_id = ?'
);

// --- Card queries ---

const createCard = db.prepare(
  'INSERT INTO cards (column_id, content, author_name, position) VALUES (?, ?, ?, ?)'
);

const getCardsByColumn = db.prepare(
  'SELECT * FROM cards WHERE column_id = ? ORDER BY position'
);

const getMaxCardPosition = db.prepare(
  'SELECT COALESCE(MAX(position), -1) as max_pos FROM cards WHERE column_id = ?'
);

const moveCard = db.prepare(
  'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
);

const getCardById = db.prepare(
  'SELECT * FROM cards WHERE id = ?'
);

// --- Comment queries ---

const createComment = db.prepare(
  'INSERT INTO comments (card_id, content, author_name) VALUES (?, ?, ?)'
);

const getCommentsByCard = db.prepare(
  'SELECT * FROM comments WHERE card_id = ? ORDER BY created_at'
);

const getCommentById = db.prepare(
  'SELECT * FROM comments WHERE id = ?'
);

// --- Composite queries ---

function getFullBoard(boardId) {
  const board = getBoardById.get(boardId);
  if (!board) return null;

  const columns = getColumnsByBoard.all(boardId);
  for (const col of columns) {
    col.cards = getCardsByColumn.all(col.id);
    for (const card of col.cards) {
      card.comments = getCommentsByCard.all(card.id);
    }
  }
  board.columns = columns;
  return board;
}

function getAllCardsForBoard(boardId) {
  const columns = getColumnsByBoard.all(boardId);
  const cards = [];
  for (const col of columns) {
    const colCards = getCardsByColumn.all(col.id);
    for (const card of colCards) {
      card.column_title = col.title;
      card.comments = getCommentsByCard.all(card.id);
      cards.push(card);
    }
  }
  return cards;
}

module.exports = {
  db,
  createBoard,
  getAllBoards,
  getBoardById,
  createColumn,
  getColumnsByBoard,
  getMaxColumnPosition,
  createCard,
  getCardsByColumn,
  getMaxCardPosition,
  moveCard,
  getCardById,
  createComment,
  getCommentsByCard,
  getCommentById,
  getFullBoard,
  getAllCardsForBoard,
};
