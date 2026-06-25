const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'retro.db');
const dataDir = path.dirname(dbPath);

let db;

async function init() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS board_columns (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES boards(id),
      title TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      column_id TEXT NOT NULL REFERENCES board_columns(id),
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES cards(id),
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  save();
}

function save() {
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function run(sql, params = []) {
  db.run(sql, params);
  save();
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();
  return row;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// --- Board operations ---

function createBoard(id, title) {
  run('INSERT INTO boards (id, title) VALUES (?, ?)', [id, title]);
  return get('SELECT * FROM boards WHERE id = ?', [id]);
}

function getAllBoards() {
  return all('SELECT * FROM boards ORDER BY created_at DESC');
}

function getBoardWithDetails(boardId) {
  const board = get('SELECT * FROM boards WHERE id = ?', [boardId]);
  if (!board) return null;
  return {
    ...board,
    columns: all('SELECT * FROM board_columns WHERE board_id = ? ORDER BY position', [boardId]),
    cards: all(`
      SELECT c.* FROM cards c
      JOIN board_columns bc ON c.column_id = bc.id
      WHERE bc.board_id = ?
      ORDER BY c.column_id, c.position
    `, [boardId]),
    comments: all(`
      SELECT cm.* FROM comments cm
      JOIN cards c ON cm.card_id = c.id
      JOIN board_columns bc ON c.column_id = bc.id
      WHERE bc.board_id = ?
      ORDER BY cm.created_at ASC
    `, [boardId]),
  };
}

function createColumn(id, boardId, title) {
  const countRow = get('SELECT COUNT(*) AS cnt FROM board_columns WHERE board_id = ?', [boardId]);
  const position = countRow ? countRow.cnt : 0;
  run('INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)', [id, boardId, title, position]);
  return { id, board_id: boardId, title, position };
}

function createCard(id, columnId, content, authorName) {
  const countRow = get('SELECT COUNT(*) AS cnt FROM cards WHERE column_id = ?', [columnId]);
  const position = countRow ? countRow.cnt : 0;
  const now = new Date().toISOString();
  run('INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)', [id, columnId, content, authorName, position, now]);
  return { id, column_id: columnId, content, author_name: authorName, position, created_at: now };
}

function moveCard(cardId, newColumnId, newPosition) {
  run('UPDATE cards SET column_id = ?, position = ? WHERE id = ?', [newColumnId, newPosition, cardId]);
}

function createComment(id, cardId, content, authorName) {
  const now = new Date().toISOString();
  run('INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)', [id, cardId, content, authorName, now]);
  return { id, card_id: cardId, content, author_name: authorName, created_at: now };
}

function getBoardExportData(boardId) {
  const board = get('SELECT * FROM boards WHERE id = ?', [boardId]);
  if (!board) return null;
  return {
    board,
    columns: all('SELECT * FROM board_columns WHERE board_id = ? ORDER BY position', [boardId]),
    cards: all(`
      SELECT c.* FROM cards c
      JOIN board_columns bc ON c.column_id = bc.id
      WHERE bc.board_id = ?
      ORDER BY c.column_id, c.position
    `, [boardId]),
    comments: all(`
      SELECT cm.* FROM comments cm
      JOIN cards c ON cm.card_id = c.id
      JOIN board_columns bc ON c.column_id = bc.id
      WHERE bc.board_id = ?
      ORDER BY cm.created_at ASC
    `, [boardId]),
  };
}

module.exports = {
  init,
  createBoard,
  getAllBoards,
  getBoardWithDetails,
  createColumn,
  createCard,
  moveCard,
  createComment,
  getBoardExportData,
};
