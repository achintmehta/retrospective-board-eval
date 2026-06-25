const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'retro.sqlite');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema initialization
db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS board_columns (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Board queries
const boardQueries = {
  getAll: db.prepare(`
    SELECT id, title, created_at FROM boards ORDER BY created_at DESC
  `),
  getById: db.prepare(`SELECT id, title, created_at FROM boards WHERE id = ?`),
  create: db.prepare(`INSERT INTO boards (id, title) VALUES (?, ?)`),
};

// Column queries
const columnQueries = {
  getByBoard: db.prepare(`
    SELECT id, board_id, title, position FROM board_columns
    WHERE board_id = ? ORDER BY position ASC
  `),
  create: db.prepare(`
    INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)
  `),
  getMaxPosition: db.prepare(`
    SELECT COALESCE(MAX(position), -1) as max_pos FROM board_columns WHERE board_id = ?
  `),
};

// Card queries
const cardQueries = {
  getByColumn: db.prepare(`
    SELECT id, column_id, content, author_name, position, created_at FROM cards
    WHERE column_id = ? ORDER BY position ASC
  `),
  getById: db.prepare(`SELECT * FROM cards WHERE id = ?`),
  create: db.prepare(`
    INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)
  `),
  getMaxPosition: db.prepare(`
    SELECT COALESCE(MAX(position), -1) as max_pos FROM cards WHERE column_id = ?
  `),
  move: db.prepare(`UPDATE cards SET column_id = ?, position = ? WHERE id = ?`),
};

// Comment queries
const commentQueries = {
  getByCard: db.prepare(`
    SELECT id, card_id, content, author_name, created_at FROM comments
    WHERE card_id = ? ORDER BY created_at ASC
  `),
  create: db.prepare(`
    INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)
  `),
};

// Higher-level utility functions
function getAllBoards() {
  return boardQueries.getAll.all();
}

function getBoardById(id) {
  const board = boardQueries.getById.get(id);
  if (!board) return null;

  const columns = columnQueries.getByBoard.all(id);
  const columnsWithCards = columns.map((col) => {
    const cards = cardQueries.getByColumn.all(col.id);
    const cardsWithComments = cards.map((card) => ({
      ...card,
      comments: commentQueries.getByCard.all(card.id),
    }));
    return { ...col, cards: cardsWithComments };
  });

  return { ...board, columns: columnsWithCards };
}

function createBoard(id, title) {
  boardQueries.create.run(id, title);
  return boardQueries.getById.get(id);
}

function createColumn(id, boardId, title) {
  const { max_pos } = columnQueries.getMaxPosition.get(boardId);
  const position = max_pos + 1;
  columnQueries.create.run(id, boardId, title, position);
  return { id, board_id: boardId, title, position };
}

function createCard(id, columnId, content, authorName) {
  const { max_pos } = cardQueries.getMaxPosition.get(columnId);
  const position = max_pos + 1;
  cardQueries.create.run(id, columnId, content, authorName, position);
  return { id, column_id: columnId, content, author_name: authorName, position, comments: [] };
}

function moveCard(cardId, targetColumnId, targetPosition) {
  cardQueries.move.run(targetColumnId, targetPosition, cardId);
  return cardQueries.getById.get(cardId);
}

function createComment(id, cardId, content, authorName) {
  commentQueries.create.run(id, cardId, content, authorName);
  return { id, card_id: cardId, content, author_name: authorName };
}

function getBoardExportData(boardId) {
  const board = boardById(boardId);
  if (!board) return null;
  const columns = columnQueries.getByBoard.all(boardId);
  const rows = [];
  for (const col of columns) {
    const cards = cardQueries.getByColumn.all(col.id);
    for (const card of cards) {
      const comments = commentQueries.getByCard.all(card.id);
      rows.push({ board: board.title, column: col.title, card: card.content, author: card.author_name, created_at: card.created_at, comments: comments.map(c => `${c.author_name}: ${c.content}`).join(' | ') });
    }
  }
  return { title: board.title, rows };
}

function boardById(id) {
  return boardQueries.getById.get(id);
}

module.exports = {
  getAllBoards,
  getBoardById,
  createBoard,
  createColumn,
  createCard,
  moveCard,
  createComment,
  getBoardExportData,
  boardById,
};
