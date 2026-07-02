const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'retro.db');

const fs = require('fs');
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);

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
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    position INTEGER NOT NULL DEFAULT 0,
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

const createBoard = db.prepare('INSERT INTO boards (title) VALUES (?)');
const getAllBoards = db.prepare('SELECT * FROM boards ORDER BY created_at DESC');
const getBoardById = db.prepare('SELECT * FROM boards WHERE id = ?');

const createColumn = db.prepare('INSERT INTO board_columns (board_id, title, position) VALUES (?, ?, ?)');
const getColumnsByBoard = db.prepare('SELECT * FROM board_columns WHERE board_id = ? ORDER BY position');
const getMaxColumnPosition = db.prepare('SELECT COALESCE(MAX(position), -1) as max_pos FROM board_columns WHERE board_id = ?');

const createCard = db.prepare('INSERT INTO cards (column_id, content, author_name, position) VALUES (?, ?, ?, ?)');
const getCardsByColumn = db.prepare('SELECT * FROM cards WHERE column_id = ? ORDER BY position');
const getMaxCardPosition = db.prepare('SELECT COALESCE(MAX(position), -1) as max_pos FROM cards WHERE column_id = ?');
const moveCard = db.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?');

const createComment = db.prepare('INSERT INTO comments (card_id, content, author_name) VALUES (?, ?, ?)');
const getCommentsByCard = db.prepare('SELECT * FROM comments WHERE card_id = ? ORDER BY created_at ASC');

function insertBoard(title) {
  const result = createBoard.run(title);
  return getBoardById.get(result.lastInsertRowid);
}

function listBoards() {
  return getAllBoards.all();
}

function getBoard(id) {
  return getBoardById.get(id);
}

function insertColumn(boardId, title) {
  const { max_pos } = getMaxColumnPosition.get(boardId);
  const result = createColumn.run(boardId, title, max_pos + 1);
  return { id: result.lastInsertRowid, board_id: boardId, title, position: max_pos + 1 };
}

function getColumnsWithCards(boardId) {
  const columns = getColumnsByBoard.all(boardId);
  return columns.map((col) => {
    const cards = getCardsByColumn.all(col.id).map((card) => {
      const comments = getCommentsByCard.all(card.id);
      return { ...card, comments };
    });
    return { ...col, cards };
  });
}

function insertCard(columnId, content, authorName) {
  const { max_pos } = getMaxCardPosition.get(columnId);
  const result = createCard.run(columnId, content, authorName, max_pos + 1);
  return {
    id: result.lastInsertRowid,
    column_id: columnId,
    content,
    author_name: authorName,
    position: max_pos + 1,
    created_at: new Date().toISOString(),
    comments: [],
  };
}

function updateCardPosition(cardId, newColumnId, newPosition) {
  moveCard.run(newColumnId, newPosition, cardId);
  return { id: cardId, column_id: newColumnId, position: newPosition };
}

function insertComment(cardId, content, authorName) {
  const result = createComment.run(cardId, content, authorName);
  return {
    id: result.lastInsertRowid,
    card_id: cardId,
    content,
    author_name: authorName,
    created_at: new Date().toISOString(),
  };
}

function getBoardExportData(boardId) {
  const board = getBoardById.get(boardId);
  if (!board) return null;
  const columns = getColumnsWithCards(boardId);
  return { board, columns };
}

module.exports = {
  db,
  insertBoard,
  listBoards,
  getBoard,
  insertColumn,
  getColumnsWithCards,
  insertCard,
  updateCardPosition,
  insertComment,
  getBoardExportData,
};
