const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'retro.sqlite');

const fs = require('fs');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (column_id) REFERENCES board_columns(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
  );
`);

// --- Board operations ---

const createBoard = db.prepare(`
  INSERT INTO boards (title) VALUES (?)
`);

const getAllBoards = db.prepare(`
  SELECT * FROM boards ORDER BY created_at DESC
`);

const getBoardById = db.prepare(`
  SELECT * FROM boards WHERE id = ?
`);

// --- Column operations ---

const createColumn = db.prepare(`
  INSERT INTO board_columns (board_id, title, position) VALUES (?, ?, ?)
`);

const getColumnsByBoard = db.prepare(`
  SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC
`);

const getMaxColumnPosition = db.prepare(`
  SELECT COALESCE(MAX(position), -1) as max_pos FROM board_columns WHERE board_id = ?
`);

// --- Card operations ---

const createCard = db.prepare(`
  INSERT INTO cards (column_id, content, author_name, position) VALUES (?, ?, ?, ?)
`);

const getCardsByColumn = db.prepare(`
  SELECT * FROM cards WHERE column_id = ? ORDER BY position ASC
`);

const getMaxCardPosition = db.prepare(`
  SELECT COALESCE(MAX(position), -1) as max_pos FROM cards WHERE column_id = ?
`);

const moveCard = db.prepare(`
  UPDATE cards SET column_id = ?, position = ? WHERE id = ?
`);

const getCardById = db.prepare(`
  SELECT * FROM cards WHERE id = ?
`);

// --- Comment operations ---

const createComment = db.prepare(`
  INSERT INTO comments (card_id, content, author_name) VALUES (?, ?, ?)
`);

const getCommentsByCard = db.prepare(`
  SELECT * FROM comments WHERE card_id = ? ORDER BY created_at ASC
`);

const getCommentById = db.prepare(`
  SELECT * FROM comments WHERE id = ?
`);

// --- Complex queries ---

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

function getFullBoardForExport(boardId) {
  const board = getBoardById.get(boardId);
  if (!board) return null;

  const rows = db.prepare(`
    SELECT
      bc.title AS column_title,
      c.content AS card_content,
      c.author_name AS card_author,
      c.created_at AS card_created_at,
      cm.content AS comment_content,
      cm.author_name AS comment_author,
      cm.created_at AS comment_created_at
    FROM board_columns bc
    LEFT JOIN cards c ON c.column_id = bc.id
    LEFT JOIN comments cm ON cm.card_id = c.id
    WHERE bc.board_id = ?
    ORDER BY bc.position, c.position, cm.created_at
  `).all(boardId);

  return { board, rows };
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
  getFullBoardForExport
};
