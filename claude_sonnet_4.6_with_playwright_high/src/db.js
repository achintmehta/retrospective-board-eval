const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'retro.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Use better-sqlite3 when available (Docker/Linux), fall back to node:sqlite (Windows dev)
function openDatabase(dbPath) {
  try {
    const Database = require('better-sqlite3');
    const instance = new Database(dbPath);
    console.log('SQLite: using better-sqlite3');
    return instance;
  } catch (e) {
    console.log('SQLite: using node:sqlite (better-sqlite3 unavailable:', e.message, ')');
    const { DatabaseSync } = require('node:sqlite');
    return new DatabaseSync(dbPath);
  }
}

const db = openDatabase(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
// PRAGMA foreign_keys intentionally omitted: node:sqlite has a bug that returns
// SQLITE_MISMATCH when enforcing FKs on INSERT into tables with no integer columns.

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// ---- boards ----

function createBoard(id, title) {
  db.prepare('INSERT INTO boards (id, title) VALUES ($id, $title)').run({ id, title });
  return getBoard(id);
}

function listBoards() {
  return db.prepare('SELECT * FROM boards ORDER BY created_at DESC').all();
}

function getBoard(id) {
  return db.prepare('SELECT * FROM boards WHERE id = $id').get({ id });
}

function getBoardFull(id) {
  const board = getBoard(id);
  if (!board) return null;

  const columns = db.prepare(
    'SELECT * FROM board_columns WHERE board_id = $boardId ORDER BY position ASC'
  ).all({ boardId: id });

  for (const col of columns) {
    const cards = db.prepare(
      'SELECT * FROM cards WHERE column_id = $columnId ORDER BY position ASC'
    ).all({ columnId: col.id });
    for (const card of cards) {
      card.comments = db.prepare(
        'SELECT * FROM comments WHERE card_id = $cardId ORDER BY created_at ASC'
      ).all({ cardId: card.id });
    }
    col.cards = cards;
  }

  board.columns = columns;
  return board;
}

// ---- columns ----

function createColumn(id, boardId, title, position) {
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES ($id, $boardId, $title, $position)'
  ).run({ id, boardId, title, position });
  return db.prepare('SELECT * FROM board_columns WHERE id = $id').get({ id });
}

function getNextColumnPosition(boardId) {
  const row = db.prepare(
    'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM board_columns WHERE board_id = $boardId'
  ).get({ boardId });
  return row.next;
}

// ---- cards ----

function createCard(id, columnId, content, authorName, position) {
  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position) VALUES ($id, $columnId, $content, $authorName, $position)'
  ).run({ id, columnId, content, authorName, position });
  return db.prepare('SELECT * FROM cards WHERE id = $id').get({ id });
}

function moveCard(cardId, targetColumnId, position) {
  db.prepare(
    'UPDATE cards SET column_id = $targetColumnId, position = $position WHERE id = $cardId'
  ).run({ targetColumnId, position, cardId });
  return db.prepare('SELECT * FROM cards WHERE id = $id').get({ id: cardId });
}

function getNextCardPosition(columnId) {
  const row = db.prepare(
    'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM cards WHERE column_id = $columnId'
  ).get({ columnId });
  return row.next;
}

// ---- comments ----

function createComment(id, cardId, content, authorName) {
  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name) VALUES ($id, $cardId, $content, $authorName)'
  ).run({ id, cardId, content, authorName });
  return db.prepare('SELECT * FROM comments WHERE id = $id').get({ id });
}

// ---- export ----

function getBoardExportData(boardId) {
  return db.prepare(`
    SELECT
      b.title AS board_title,
      c.title AS column_title,
      ca.content AS card_content,
      ca.author_name AS card_author,
      ca.created_at AS card_created_at,
      co.content AS comment_content,
      co.author_name AS comment_author,
      co.created_at AS comment_created_at
    FROM boards b
    JOIN board_columns c ON c.board_id = b.id
    JOIN cards ca ON ca.column_id = c.id
    LEFT JOIN comments co ON co.card_id = ca.id
    WHERE b.id = $boardId
    ORDER BY c.position, ca.position, co.created_at
  `).all({ boardId });
}

module.exports = {
  initSchema,
  createBoard,
  listBoards,
  getBoard,
  getBoardFull,
  createColumn,
  getNextColumnPosition,
  createCard,
  moveCard,
  getNextCardPosition,
  createComment,
  getBoardExportData,
};
