const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '..', 'data');
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'retro.sqlite');

let db;

function id() {
  return crypto.randomBytes(8).toString('hex');
}

function now() {
  return new Date().toISOString();
}

function initDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new DatabaseSync(DB_FILE);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS board_columns (
      id          TEXT PRIMARY KEY,
      board_id    TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      position    INTEGER NOT NULL,
      created_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_columns_board ON board_columns(board_id);

    CREATE TABLE IF NOT EXISTS cards (
      id          TEXT PRIMARY KEY,
      column_id   TEXT NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
      content     TEXT NOT NULL,
      author_name TEXT NOT NULL,
      position    INTEGER NOT NULL,
      created_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id);

    CREATE TABLE IF NOT EXISTS comments (
      id          TEXT PRIMARY KEY,
      card_id     TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      content     TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id);
  `);

  return db;
}

function getDb() {
  if (!db) initDb();
  return db;
}

function transaction(fn) {
  const dbi = getDb();
  dbi.exec('BEGIN');
  try {
    const result = fn(dbi);
    dbi.exec('COMMIT');
    return result;
  } catch (err) {
    try { dbi.exec('ROLLBACK'); } catch (_) {}
    throw err;
  }
}

// ---------- Boards ----------

function createBoard(title) {
  const board = { id: id(), title: String(title).trim(), created_at: now() };
  getDb()
    .prepare('INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)')
    .run(board.id, board.title, board.created_at);

  // Seed default retro columns
  const defaults = ['Went Well', 'Needs Improvement', 'Action Items'];
  defaults.forEach((title, i) => {
    createColumn(board.id, title, i);
  });

  return board;
}

function listBoards() {
  return getDb()
    .prepare('SELECT id, title, created_at FROM boards ORDER BY created_at DESC')
    .all();
}

function getBoard(boardId) {
  const board = getDb()
    .prepare('SELECT id, title, created_at FROM boards WHERE id = ?')
    .get(boardId);
  if (!board) return null;

  const columns = getDb()
    .prepare(
      'SELECT id, board_id, title, position, created_at FROM board_columns WHERE board_id = ? ORDER BY position ASC, created_at ASC'
    )
    .all(boardId);

  const cards = columns.length
    ? getDb()
        .prepare(
          `SELECT id, column_id, content, author_name, position, created_at
           FROM cards
           WHERE column_id IN (${columns.map(() => '?').join(',')})
           ORDER BY position ASC, created_at ASC`
        )
        .all(...columns.map((c) => c.id))
    : [];

  const comments = cards.length
    ? getDb()
        .prepare(
          `SELECT id, card_id, content, author_name, created_at
           FROM comments
           WHERE card_id IN (${cards.map(() => '?').join(',')})
           ORDER BY created_at ASC`
        )
        .all(...cards.map((c) => c.id))
    : [];

  return { ...board, columns, cards, comments };
}

// ---------- Columns ----------

function createColumn(boardId, title, position) {
  const col = {
    id: id(),
    board_id: boardId,
    title: String(title).trim(),
    position:
      typeof position === 'number'
        ? position
        : nextColumnPosition(boardId),
    created_at: now(),
  };
  getDb()
    .prepare(
      'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    .run(col.id, col.board_id, col.title, col.position, col.created_at);
  return col;
}

function nextColumnPosition(boardId) {
  const row = getDb()
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS max_pos FROM board_columns WHERE board_id = ?'
    )
    .get(boardId);
  return (row?.max_pos ?? -1) + 1;
}

function columnExists(columnId) {
  return !!getDb()
    .prepare('SELECT 1 FROM board_columns WHERE id = ?')
    .get(columnId);
}

function getColumnBoardId(columnId) {
  const row = getDb()
    .prepare('SELECT board_id FROM board_columns WHERE id = ?')
    .get(columnId);
  return row ? row.board_id : null;
}

// ---------- Cards ----------

function nextCardPosition(columnId) {
  const row = getDb()
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS max_pos FROM cards WHERE column_id = ?'
    )
    .get(columnId);
  return (row?.max_pos ?? -1) + 1;
}

function createCard({ columnId, content, authorName }) {
  if (!columnExists(columnId)) {
    throw new Error('Column does not exist');
  }
  const card = {
    id: id(),
    column_id: columnId,
    content: String(content).trim(),
    author_name: String(authorName).trim() || 'Guest',
    position: nextCardPosition(columnId),
    created_at: now(),
  };
  getDb()
    .prepare(
      'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(
      card.id,
      card.column_id,
      card.content,
      card.author_name,
      card.position,
      card.created_at
    );
  return card;
}

function getCardBoardId(cardId) {
  const row = getDb()
    .prepare(
      `SELECT bc.board_id FROM cards c
       JOIN board_columns bc ON bc.id = c.column_id
       WHERE c.id = ?`
    )
    .get(cardId);
  return row ? row.board_id : null;
}

// Move a card: optionally change column, optionally place at a target index
// (zero-based) in the destination column. We renumber positions to keep them
// dense and deterministic for broadcast consumers.
function moveCard({ cardId, toColumnId, toIndex }) {
  const dbi = getDb();
  const card = dbi
    .prepare(
      'SELECT id, column_id, position FROM cards WHERE id = ?'
    )
    .get(cardId);
  if (!card) throw new Error('Card does not exist');
  if (!columnExists(toColumnId)) throw new Error('Destination column does not exist');

  const targetIndex =
    typeof toIndex === 'number' && toIndex >= 0 ? Math.floor(toIndex) : 0;
  const fromColumnId = card.column_id;

  transaction(() => {
    // Temporarily park the card to avoid position collisions during renumbering
    dbi
      .prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?')
      .run(toColumnId, -1, cardId);

    if (fromColumnId !== toColumnId) {
      renumberColumn(fromColumnId);
    }

    // Renumber destination column, inserting card at targetIndex
    const dest = dbi
      .prepare(
        'SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position ASC, created_at ASC'
      )
      .all(toColumnId, cardId);

    const newOrder = [...dest];
    const clampedIndex = Math.min(targetIndex, newOrder.length);
    newOrder.splice(clampedIndex, 0, { id: cardId });

    const upd = dbi.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?');
    newOrder.forEach((c, idx) => upd.run(toColumnId, idx, c.id));
  });

  return dbi
    .prepare(
      'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?'
    )
    .get(cardId);
}

function renumberColumn(columnId) {
  const dbi = getDb();
  const rows = dbi
    .prepare(
      'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC, created_at ASC'
    )
    .all(columnId);
  const upd = dbi.prepare('UPDATE cards SET position = ? WHERE id = ?');
  rows.forEach((r, idx) => upd.run(idx, r.id));
}

// ---------- Comments ----------

function createComment({ cardId, content, authorName }) {
  const card = getDb().prepare('SELECT id FROM cards WHERE id = ?').get(cardId);
  if (!card) throw new Error('Card does not exist');
  const comment = {
    id: id(),
    card_id: cardId,
    content: String(content).trim(),
    author_name: String(authorName).trim() || 'Guest',
    created_at: now(),
  };
  getDb()
    .prepare(
      'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    .run(
      comment.id,
      comment.card_id,
      comment.content,
      comment.author_name,
      comment.created_at
    );
  return comment;
}

module.exports = {
  initDb,
  getDb,
  createBoard,
  listBoards,
  getBoard,
  createColumn,
  getColumnBoardId,
  createCard,
  getCardBoardId,
  moveCard,
  createComment,
};
