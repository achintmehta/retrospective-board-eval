import sqlite3pkg from 'sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const sqlite3 = sqlite3pkg.verbose();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '..', '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'retro.sqlite');

const db = new sqlite3.Database(DB_PATH);

// Promise helpers
export const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

export const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

export const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

export const exec = (sql) =>
  new Promise((resolve, reject) => {
    db.exec(sql, (err) => (err ? reject(err) : resolve()));
  });

// --- Schema ---
export async function initSchema() {
  await exec('PRAGMA journal_mode = WAL;');
  await exec('PRAGMA foreign_keys = ON;');
  await exec(`
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

    CREATE INDEX IF NOT EXISTS idx_columns_board ON board_columns(board_id);
    CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id);
    CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id);
  `);
}

// --- Queries ---
const now = () => Date.now();

export async function createBoard(title) {
  const id = randomUUID();
  const createdAt = now();
  await run('INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)', [id, title, createdAt]);

  // Seed default columns
  const defaults = ['Went Well', 'Needs Improvement', 'Action Items'];
  for (let i = 0; i < defaults.length; i++) {
    await run(
      'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)',
      [randomUUID(), id, defaults[i], i, createdAt]
    );
  }
  return getBoardSummary(id);
}

export function getBoardSummary(id) {
  return get('SELECT * FROM boards WHERE id = ?', [id]);
}

export function listBoards() {
  return all('SELECT * FROM boards ORDER BY created_at DESC');
}

export async function getBoardFull(boardId) {
  const board = await get('SELECT * FROM boards WHERE id = ?', [boardId]);
  if (!board) return null;
  const columns = await all(
    'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC, created_at ASC',
    [boardId]
  );
  const columnIds = columns.map((c) => c.id);
  const cards = columnIds.length
    ? await all(
        `SELECT * FROM cards WHERE column_id IN (${columnIds.map(() => '?').join(',')})
         ORDER BY position ASC, created_at ASC`,
        columnIds
      )
    : [];
  const cardIds = cards.map((c) => c.id);
  const comments = cardIds.length
    ? await all(
        `SELECT * FROM comments WHERE card_id IN (${cardIds.map(() => '?').join(',')})
         ORDER BY created_at ASC`,
        cardIds
      )
    : [];

  const commentsByCard = new Map();
  for (const cm of comments) {
    if (!commentsByCard.has(cm.card_id)) commentsByCard.set(cm.card_id, []);
    commentsByCard.get(cm.card_id).push(cm);
  }
  const cardsByColumn = new Map();
  for (const c of cards) {
    if (!cardsByColumn.has(c.column_id)) cardsByColumn.set(c.column_id, []);
    cardsByColumn.get(c.column_id).push({ ...c, comments: commentsByCard.get(c.id) || [] });
  }

  return {
    ...board,
    columns: columns.map((col) => ({
      ...col,
      cards: cardsByColumn.get(col.id) || [],
    })),
  };
}

export async function createColumn(boardId, title) {
  const board = await getBoardSummary(boardId);
  if (!board) throw new Error('Board not found');
  const row = await get(
    'SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM board_columns WHERE board_id = ?',
    [boardId]
  );
  const id = randomUUID();
  await run(
    'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, boardId, title, row.pos, now()]
  );
  return get('SELECT * FROM board_columns WHERE id = ?', [id]);
}

export async function createCard({ columnId, content, authorName }) {
  const col = await get('SELECT * FROM board_columns WHERE id = ?', [columnId]);
  if (!col) throw new Error('Column not found');
  const row = await get(
    'SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM cards WHERE column_id = ?',
    [columnId]
  );
  const id = randomUUID();
  const createdAt = now();
  await run(
    'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, columnId, content, authorName, row.pos, createdAt]
  );
  const card = await get('SELECT * FROM cards WHERE id = ?', [id]);
  return { card, boardId: col.board_id };
}

// Move a card to a target column at a target index (0-based).
// Rewrites positions in both source and destination columns to keep them dense.
export async function moveCard({ cardId, toColumnId, toIndex }) {
  const card = await get('SELECT * FROM cards WHERE id = ?', [cardId]);
  if (!card) throw new Error('Card not found');
  const toColumn = await get('SELECT * FROM board_columns WHERE id = ?', [toColumnId]);
  if (!toColumn) throw new Error('Target column not found');

  const fromColumnId = card.column_id;
  // Fetch destination cards excluding the moving card
  const destCards = await all(
    'SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position ASC, created_at ASC',
    [toColumnId, cardId]
  );

  const clampedIndex = Math.max(0, Math.min(toIndex ?? destCards.length, destCards.length));
  const newOrder = [...destCards.map((c) => c.id)];
  newOrder.splice(clampedIndex, 0, cardId);

  // Update positions in destination column
  for (let i = 0; i < newOrder.length; i++) {
    await run('UPDATE cards SET column_id = ?, position = ? WHERE id = ?', [
      toColumnId,
      i,
      newOrder[i],
    ]);
  }

  // If moved across columns, repack source column
  if (fromColumnId !== toColumnId) {
    const srcCards = await all(
      'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC, created_at ASC',
      [fromColumnId]
    );
    for (let i = 0; i < srcCards.length; i++) {
      await run('UPDATE cards SET position = ? WHERE id = ?', [i, srcCards[i].id]);
    }
  }

  const updated = await get('SELECT * FROM cards WHERE id = ?', [cardId]);
  return {
    card: updated,
    fromColumnId,
    toColumnId,
    boardId: toColumn.board_id,
  };
}

export async function createComment({ cardId, content, authorName }) {
  const card = await get('SELECT c.*, col.board_id FROM cards c JOIN board_columns col ON c.column_id = col.id WHERE c.id = ?', [cardId]);
  if (!card) throw new Error('Card not found');
  const id = randomUUID();
  const createdAt = now();
  await run(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, cardId, content, authorName, createdAt]
  );
  const comment = await get('SELECT * FROM comments WHERE id = ?', [id]);
  return { comment, boardId: card.board_id };
}

export default db;
