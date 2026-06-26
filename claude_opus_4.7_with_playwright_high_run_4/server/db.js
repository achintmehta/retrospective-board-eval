import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

const DATA_DIR = process.env.DATA_DIR || path.resolve('data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const dbPath = path.join(DATA_DIR, 'retro.sqlite');
export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS board_columns (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_columns_board ON board_columns(board_id, position);
  CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id, position);
  CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id, created_at);
`);

const now = () => Date.now();
const newId = () => randomUUID();

// --- Boards ---
const insertBoard = db.prepare('INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)');
const selectAllBoards = db.prepare('SELECT id, title, created_at FROM boards ORDER BY created_at DESC');
const selectBoard = db.prepare('SELECT id, title, created_at FROM boards WHERE id = ?');

export function createBoard(title) {
  const id = newId();
  const created_at = now();
  insertBoard.run(id, title, created_at);
  // Seed default columns for a typical retro
  const defaults = ['Went Well', 'Needs Improvement', 'Action Items'];
  defaults.forEach((t, i) => createColumn(id, t, i));
  return getBoard(id);
}

export function listBoards() {
  return selectAllBoards.all();
}

export function getBoard(id) {
  return selectBoard.get(id) || null;
}

// --- Columns ---
const insertColumn = db.prepare(
  'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)'
);
const selectColumnsForBoard = db.prepare(
  'SELECT id, board_id, title, position, created_at FROM board_columns WHERE board_id = ? ORDER BY position ASC, created_at ASC'
);
const maxColumnPos = db.prepare(
  'SELECT COALESCE(MAX(position), -1) AS m FROM board_columns WHERE board_id = ?'
);

export function createColumn(boardId, title, position) {
  if (position === undefined || position === null) {
    position = maxColumnPos.get(boardId).m + 1;
  }
  const id = newId();
  insertColumn.run(id, boardId, title, position, now());
  return getColumn(id);
}

const selectColumn = db.prepare(
  'SELECT id, board_id, title, position, created_at FROM board_columns WHERE id = ?'
);
export function getColumn(id) {
  return selectColumn.get(id) || null;
}

export function listColumns(boardId) {
  return selectColumnsForBoard.all(boardId);
}

// --- Cards ---
const insertCard = db.prepare(
  'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
);
const selectCardsForColumn = db.prepare(
  'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE column_id = ? ORDER BY position ASC, created_at ASC'
);
const selectCardsForBoard = db.prepare(`
  SELECT c.id, c.column_id, c.content, c.author_name, c.position, c.created_at
  FROM cards c
  JOIN board_columns bc ON bc.id = c.column_id
  WHERE bc.board_id = ?
  ORDER BY bc.position ASC, c.position ASC, c.created_at ASC
`);
const maxCardPos = db.prepare(
  'SELECT COALESCE(MAX(position), -1) AS m FROM cards WHERE column_id = ?'
);
const updateCardColumnAndPos = db.prepare(
  'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
);
const selectCard = db.prepare(
  'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?'
);

export function createCard(columnId, content, authorName) {
  const position = maxCardPos.get(columnId).m + 1;
  const id = newId();
  insertCard.run(id, columnId, content, authorName, position, now());
  return getCard(id);
}

export function getCard(id) {
  return selectCard.get(id) || null;
}

export function listCardsForBoard(boardId) {
  return selectCardsForBoard.all(boardId);
}

const selectCardsInColumnExcept = db.prepare(
  'SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position ASC, created_at ASC'
);
const selectCardsInColumn = db.prepare(
  'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC, created_at ASC'
);
const updateCardPos = db.prepare('UPDATE cards SET position = ? WHERE id = ?');

export function moveCard(cardId, toColumnId, toPosition) {
  const card = getCard(cardId);
  if (!card) return null;
  const fromColumnId = card.column_id;

  db.exec('BEGIN');
  try {
    const destCards = selectCardsInColumnExcept.all(toColumnId, cardId);
    const insertAt = Math.max(0, Math.min(toPosition, destCards.length));
    const newOrder = [
      ...destCards.slice(0, insertAt).map((c) => c.id),
      cardId,
      ...destCards.slice(insertAt).map((c) => c.id)
    ];
    newOrder.forEach((id, i) => updateCardColumnAndPos.run(toColumnId, i, id));

    if (fromColumnId !== toColumnId) {
      const srcCards = selectCardsInColumn.all(fromColumnId);
      srcCards.forEach((c, i) => updateCardPos.run(i, c.id));
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return getCard(cardId);
}

// --- Comments ---
const insertComment = db.prepare(
  'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
);
const selectCommentsForCard = db.prepare(
  'SELECT id, card_id, content, author_name, created_at FROM comments WHERE card_id = ? ORDER BY created_at ASC'
);
const selectCommentsForBoard = db.prepare(`
  SELECT cm.id, cm.card_id, cm.content, cm.author_name, cm.created_at
  FROM comments cm
  JOIN cards c ON c.id = cm.card_id
  JOIN board_columns bc ON bc.id = c.column_id
  WHERE bc.board_id = ?
  ORDER BY cm.created_at ASC
`);
const selectComment = db.prepare(
  'SELECT id, card_id, content, author_name, created_at FROM comments WHERE id = ?'
);

export function createComment(cardId, content, authorName) {
  const id = newId();
  insertComment.run(id, cardId, content, authorName, now());
  return selectComment.get(id);
}

export function listCommentsForCard(cardId) {
  return selectCommentsForCard.all(cardId);
}

export function listCommentsForBoard(boardId) {
  return selectCommentsForBoard.all(boardId);
}

// --- Composite fetch ---
export function getFullBoard(boardId) {
  const board = getBoard(boardId);
  if (!board) return null;
  const columns = listColumns(boardId);
  const cards = listCardsForBoard(boardId);
  const comments = listCommentsForBoard(boardId);
  const cardsByColumn = new Map(columns.map((c) => [c.id, []]));
  const commentsByCard = new Map();
  for (const c of cards) {
    if (!cardsByColumn.has(c.column_id)) cardsByColumn.set(c.column_id, []);
    cardsByColumn.get(c.column_id).push({ ...c, comments: [] });
  }
  for (const cm of comments) {
    if (!commentsByCard.has(cm.card_id)) commentsByCard.set(cm.card_id, []);
    commentsByCard.get(cm.card_id).push(cm);
  }
  const decoratedColumns = columns.map((col) => ({
    ...col,
    cards: (cardsByColumn.get(col.id) || []).map((card) => ({
      ...card,
      comments: commentsByCard.get(card.id) || []
    }))
  }));
  return { ...board, columns: decoratedColumns };
}

export function getCardColumnBoard(cardId) {
  return db
    .prepare(
      `SELECT bc.board_id AS board_id, c.column_id AS column_id
       FROM cards c JOIN board_columns bc ON bc.id = c.column_id
       WHERE c.id = ?`
    )
    .get(cardId);
}

export function getColumnBoard(columnId) {
  return db.prepare('SELECT board_id FROM board_columns WHERE id = ?').get(columnId);
}
