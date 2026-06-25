const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'retro.sqlite');

let db = null;

function persistDb() {
  const data = db.export();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function initDb() {
  const SQL = await initSqlJs();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS board_columns (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      column_id TEXT NOT NULL,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (column_id) REFERENCES board_columns(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    )
  `);

  persistDb();
  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

// --- Boards ---

function createBoard(id, title) {
  const created_at = new Date().toISOString();
  getDb().run('INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)', [id, title, created_at]);
  persistDb();
  return { id, title, created_at };
}

function getAllBoards() {
  const stmt = getDb().prepare('SELECT * FROM boards ORDER BY created_at DESC');
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function getBoardById(id) {
  const stmt = getDb().prepare('SELECT * FROM boards WHERE id = ?');
  stmt.bind([id]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

// --- Columns ---

function createColumn(id, boardId, title, position) {
  getDb().run(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)',
    [id, boardId, title, position]
  );
  persistDb();
  return { id, board_id: boardId, title, position };
}

function getColumnsByBoardId(boardId) {
  const stmt = getDb().prepare('SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC');
  stmt.bind([boardId]);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// --- Cards ---

function createCard(id, columnId, content, authorName, position) {
  const created_at = new Date().toISOString();
  getDb().run(
    'INSERT INTO cards (id, column_id, content, author_name, created_at, position) VALUES (?, ?, ?, ?, ?, ?)',
    [id, columnId, content, authorName, created_at, position]
  );
  persistDb();
  return { id, column_id: columnId, content, author_name: authorName, created_at, position };
}

function getCardsByColumnId(columnId) {
  const stmt = getDb().prepare('SELECT * FROM cards WHERE column_id = ? ORDER BY position ASC');
  stmt.bind([columnId]);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function getCardCountForColumn(columnId) {
  const stmt = getDb().prepare('SELECT COUNT(*) as count FROM cards WHERE column_id = ?');
  stmt.bind([columnId]);
  const row = stmt.step() ? stmt.getAsObject() : { count: 0 };
  stmt.free();
  return row.count;
}

function moveCard(cardId, newColumnId, newPosition) {
  getDb().run(
    'UPDATE cards SET column_id = ?, position = ? WHERE id = ?',
    [newColumnId, newPosition, cardId]
  );
  persistDb();
}

function getCardById(cardId) {
  const stmt = getDb().prepare('SELECT * FROM cards WHERE id = ?');
  stmt.bind([cardId]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

// --- Comments ---

function createComment(id, cardId, content, authorName) {
  const created_at = new Date().toISOString();
  getDb().run(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, cardId, content, authorName, created_at]
  );
  persistDb();
  return { id, card_id: cardId, content, author_name: authorName, created_at };
}

function getCommentsByCardId(cardId) {
  const stmt = getDb().prepare('SELECT * FROM comments WHERE card_id = ? ORDER BY created_at ASC');
  stmt.bind([cardId]);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// --- Full Board ---

function getFullBoard(boardId) {
  const board = getBoardById(boardId);
  if (!board) return null;

  const columns = getColumnsByBoardId(boardId);
  const result = { ...board, columns: [] };

  for (const col of columns) {
    const cards = getCardsByColumnId(col.id);
    const cardsWithComments = cards.map(card => ({
      ...card,
      comments: getCommentsByCardId(card.id)
    }));
    result.columns.push({ ...col, cards: cardsWithComments });
  }

  return result;
}

// --- Export ---

function getBoardExportData(boardId) {
  const board = getBoardById(boardId);
  if (!board) return null;

  const columns = getColumnsByBoardId(boardId);
  const rows = [];

  for (const col of columns) {
    const cards = getCardsByColumnId(col.id);
    for (const card of cards) {
      const comments = getCommentsByCardId(card.id);
      rows.push({
        board_title: board.title,
        column: col.title,
        card_id: card.id,
        card_content: card.content,
        card_author: card.author_name,
        card_created_at: card.created_at,
        comment_id: '',
        comment_content: '',
        comment_author: '',
        comment_created_at: ''
      });
      for (const comment of comments) {
        rows.push({
          board_title: board.title,
          column: col.title,
          card_id: card.id,
          card_content: card.content,
          card_author: card.author_name,
          card_created_at: card.created_at,
          comment_id: comment.id,
          comment_content: comment.content,
          comment_author: comment.author_name,
          comment_created_at: comment.created_at
        });
      }
    }
  }

  return rows;
}

module.exports = {
  initDb,
  getDb,
  createBoard,
  getAllBoards,
  getBoardById,
  createColumn,
  getColumnsByBoardId,
  createCard,
  getCardsByColumnId,
  getCardCountForColumn,
  moveCard,
  getCardById,
  createComment,
  getCommentsByCardId,
  getFullBoard,
  getBoardExportData
};
