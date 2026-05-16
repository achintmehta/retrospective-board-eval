const Database = require('better-sqlite3');
const path = require('path');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..');
const dbPath = path.join(dataDir, 'retro.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

const existing = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='boards'").get();
if (existing) {
  const cols = db.pragma('table_info(boards)');
  const idCol = cols.find(c => c.name === 'id');
  if (!idCol || idCol.type.toUpperCase() !== 'INTEGER') {
    db.pragma('foreign_keys = OFF');
    db.exec('DROP TABLE IF EXISTS comments; DROP TABLE IF EXISTS cards; DROP TABLE IF EXISTS board_columns; DROP TABLE IF EXISTS boards;');
    db.pragma('foreign_keys = ON');
  }
}

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
  getCommentsByCard: db.prepare('SELECT * FROM comments WHERE card_id = ? ORDER BY created_at'),
};

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

function createBoard(title) {
  const result = queries.createBoard.run(title);
  const boardId = Number(result.lastInsertRowid);
  for (const [i, col] of DEFAULT_COLUMNS.entries()) {
    queries.createColumn.run(boardId, col, i);
  }
  return queries.getBoardById.get(boardId);
}

function getAllBoards() {
  return queries.getAllBoards.all();
}

function getBoardWithDetails(boardId) {
  const board = queries.getBoardById.get(boardId);
  if (!board) return null;

  const columns = queries.getColumnsByBoard.all(boardId);
  for (const col of columns) {
    col.cards = queries.getCardsByColumn.all(col.id);
    for (const card of col.cards) {
      card.comments = queries.getCommentsByCard.all(card.id);
    }
  }
  board.columns = columns;
  return board;
}

function createColumn(boardId, title) {
  const { max_pos } = queries.getMaxColumnPosition.get(boardId);
  const result = queries.createColumn.run(boardId, title, max_pos + 1);
  return { id: result.lastInsertRowid, board_id: boardId, title, position: max_pos + 1 };
}

function createCard(columnId, content, authorName) {
  const { max_pos } = queries.getMaxCardPosition.get(columnId);
  const result = queries.createCard.run(columnId, content, authorName, max_pos + 1);
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

function moveCard(cardId, newColumnId, newPosition) {
  queries.moveCard.run(newColumnId, newPosition, cardId);
  return { id: cardId, column_id: newColumnId, position: newPosition };
}

function createComment(cardId, content, authorName) {
  const result = queries.createComment.run(cardId, content, authorName);
  return {
    id: result.lastInsertRowid,
    card_id: cardId,
    content,
    author_name: authorName,
    created_at: new Date().toISOString(),
  };
}

module.exports = {
  db,
  createBoard,
  getAllBoards,
  getBoardWithDetails,
  createColumn,
  createCard,
  moveCard,
  createComment,
};
