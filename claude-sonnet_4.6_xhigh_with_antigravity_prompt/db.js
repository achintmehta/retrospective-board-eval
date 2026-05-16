const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'retro.db');

let db = null;

function run(sql, params = []) {
  db.run(sql, params);
}

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function save() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS board_columns (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (board_id) REFERENCES boards(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      column_id TEXT NOT NULL,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (column_id) REFERENCES board_columns(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_id) REFERENCES cards(id)
    )
  `);
  save();
}

async function init() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  createTables();
}

function createBoard(title) {
  const id = uuidv4();
  run('INSERT INTO boards (id, title) VALUES (?, ?)', [id, title]);
  const defaultColumns = ['Went Well', 'Needs Improvement', 'Action Items'];
  defaultColumns.forEach((colTitle, index) => {
    run('INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)', [uuidv4(), id, colTitle, index]);
  });
  save();
  return getBoard(id);
}

function getAllBoards() {
  return query('SELECT * FROM boards ORDER BY created_at DESC');
}

function getBoard(boardId) {
  const board = queryOne('SELECT * FROM boards WHERE id = ?', [boardId]);
  if (!board) return null;

  const columns = query('SELECT * FROM board_columns WHERE board_id = ? ORDER BY position', [boardId]);
  board.columns = columns.map(col => {
    const cards = query('SELECT * FROM cards WHERE column_id = ? ORDER BY position ASC, created_at ASC', [col.id]);
    col.cards = cards.map(card => {
      card.comments = query('SELECT * FROM comments WHERE card_id = ? ORDER BY created_at ASC', [card.id]);
      return card;
    });
    return col;
  });

  return board;
}

function createColumn(boardId, title) {
  const maxPos = queryOne('SELECT MAX(position) as max_pos FROM board_columns WHERE board_id = ?', [boardId]);
  const position = (maxPos && maxPos.max_pos != null) ? maxPos.max_pos + 1 : 0;
  const id = uuidv4();
  run('INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)', [id, boardId, title, position]);
  save();
  return queryOne('SELECT * FROM board_columns WHERE id = ?', [id]);
}

function addCard(columnId, content, authorName) {
  const maxPos = queryOne('SELECT MAX(position) as max_pos FROM cards WHERE column_id = ?', [columnId]);
  const position = (maxPos && maxPos.max_pos != null) ? maxPos.max_pos + 1 : 0;
  const id = uuidv4();
  run('INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)', [id, columnId, content, authorName, position]);
  save();
  const card = queryOne('SELECT * FROM cards WHERE id = ?', [id]);
  card.comments = [];
  return card;
}

function moveCard(cardId, newColumnId, newPosition) {
  run('UPDATE cards SET column_id = ?, position = ? WHERE id = ?', [newColumnId, newPosition, cardId]);
  save();
}

function addComment(cardId, content, authorName) {
  const id = uuidv4();
  run('INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)', [id, cardId, content, authorName]);
  save();
  return queryOne('SELECT * FROM comments WHERE id = ?', [id]);
}

module.exports = { init, createBoard, getAllBoards, getBoard, createColumn, addCard, moveCard, addComment };
