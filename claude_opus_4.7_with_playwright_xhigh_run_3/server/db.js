import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const DB_PATH = process.env.DB_PATH || resolve(process.cwd(), 'data', 'retro.sqlite');

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS board_columns (
    id        TEXT PRIMARY KEY,
    board_id  TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title     TEXT NOT NULL,
    position  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cards (
    id          TEXT PRIMARY KEY,
    column_id   TEXT NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    author_name TEXT NOT NULL,
    position    INTEGER NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comments (
    id          TEXT PRIMARY KEY,
    card_id     TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_columns_board   ON board_columns(board_id);
  CREATE INDEX IF NOT EXISTS idx_cards_column    ON cards(column_id);
  CREATE INDEX IF NOT EXISTS idx_comments_card   ON comments(card_id);
`);

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// --- Boards ---

export function createBoard(title) {
  const id = randomUUID();
  const insertBoard = db.prepare('INSERT INTO boards (id, title) VALUES (?, ?)');
  const insertColumn = db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  );

  transaction(() => {
    insertBoard.run(id, title);
    DEFAULT_COLUMNS.forEach((columnTitle, position) => {
      insertColumn.run(randomUUID(), id, columnTitle, position);
    });
  });

  return getBoard(id);
}

export function listBoards() {
  return db.prepare('SELECT * FROM boards ORDER BY created_at DESC').all();
}

export function getBoard(id) {
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
  if (!board) return null;

  const columns = db
    .prepare('SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC')
    .all(id);

  const columnIds = columns.map((c) => c.id);
  const cards = columnIds.length
    ? db
        .prepare(
          `SELECT * FROM cards WHERE column_id IN (${columnIds.map(() => '?').join(',')}) ORDER BY position ASC`
        )
        .all(...columnIds)
    : [];

  const cardIds = cards.map((c) => c.id);
  const comments = cardIds.length
    ? db
        .prepare(
          `SELECT * FROM comments WHERE card_id IN (${cardIds.map(() => '?').join(',')}) ORDER BY created_at ASC`
        )
        .all(...cardIds)
    : [];

  const commentsByCard = new Map();
  for (const c of comments) {
    if (!commentsByCard.has(c.card_id)) commentsByCard.set(c.card_id, []);
    commentsByCard.get(c.card_id).push(c);
  }

  const cardsByColumn = new Map();
  for (const card of cards) {
    if (!cardsByColumn.has(card.column_id)) cardsByColumn.set(card.column_id, []);
    cardsByColumn.get(card.column_id).push({ ...card, comments: commentsByCard.get(card.id) || [] });
  }

  return {
    ...board,
    columns: columns.map((col) => ({ ...col, cards: cardsByColumn.get(col.id) || [] })),
  };
}

// --- Columns ---

export function createColumn(boardId, title) {
  const id = randomUUID();
  const row = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS maxPos FROM board_columns WHERE board_id = ?')
    .get(boardId);
  const position = (row?.maxPos ?? -1) + 1;
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  ).run(id, boardId, title, position);
  return db.prepare('SELECT * FROM board_columns WHERE id = ?').get(id);
}

export function getColumn(id) {
  return db.prepare('SELECT * FROM board_columns WHERE id = ?').get(id);
}

// --- Cards ---

export function createCard({ columnId, content, authorName }) {
  const id = randomUUID();
  const row = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS maxPos FROM cards WHERE column_id = ?')
    .get(columnId);
  const position = (row?.maxPos ?? -1) + 1;
  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)'
  ).run(id, columnId, content, authorName, position);
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
  return { ...card, comments: [] };
}

export function moveCard({ cardId, toColumnId, toIndex }) {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
  if (!card) return null;
  const targetColumn = db.prepare('SELECT * FROM board_columns WHERE id = ?').get(toColumnId);
  if (!targetColumn) return null;

  const fromColumnId = card.column_id;
  const desiredIndex = Number.isInteger(toIndex) ? toIndex : 0;

  transaction(() => {
    if (fromColumnId === toColumnId) {
      const cards = db
        .prepare('SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC')
        .all(toColumnId)
        .map((c) => c.id)
        .filter((id) => id !== cardId);
      const clamped = Math.max(0, Math.min(desiredIndex, cards.length));
      cards.splice(clamped, 0, cardId);
      const updatePos = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
      cards.forEach((id, pos) => updatePos.run(pos, id));
    } else {
      const fromCards = db
        .prepare('SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC')
        .all(fromColumnId)
        .map((c) => c.id)
        .filter((id) => id !== cardId);
      const toCards = db
        .prepare('SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC')
        .all(toColumnId)
        .map((c) => c.id);
      const clamped = Math.max(0, Math.min(desiredIndex, toCards.length));
      toCards.splice(clamped, 0, cardId);

      db.prepare('UPDATE cards SET column_id = ? WHERE id = ?').run(toColumnId, cardId);

      const updatePos = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
      fromCards.forEach((id, pos) => updatePos.run(pos, id));
      toCards.forEach((id, pos) => updatePos.run(pos, id));
    }
  });

  return {
    cardId,
    fromColumnId,
    toColumnId,
    toIndex: desiredIndex,
  };
}

// --- Comments ---

export function createComment({ cardId, content, authorName }) {
  const id = randomUUID();
  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)'
  ).run(id, cardId, content, authorName);
  return db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
}

// --- Export helpers ---

export function getBoardForExport(boardId) {
  return getBoard(boardId);
}

export default db;
