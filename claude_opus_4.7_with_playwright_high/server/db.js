import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const dbFile = path.join(DATA_DIR, 'retro.sqlite');

export const db = new DatabaseSync(dbFile);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

function tx(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

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
    position INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_board_columns_board ON board_columns(board_id);

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id);

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id);
`);

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

export function createBoard(title) {
  const id = randomUUID();
  const now = Date.now();
  const insertBoard = db.prepare(
    'INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)',
  );
  const insertColumn = db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)',
  );
  tx(() => {
    insertBoard.run(id, title, now);
    DEFAULT_COLUMNS.forEach((name, idx) => {
      insertColumn.run(randomUUID(), id, name, idx);
    });
  });
  return getBoard(id);
}

export function listBoards() {
  return db
    .prepare('SELECT id, title, created_at FROM boards ORDER BY created_at DESC')
    .all();
}

export function getBoard(id) {
  const board = db
    .prepare('SELECT id, title, created_at FROM boards WHERE id = ?')
    .get(id);
  if (!board) return null;

  const columns = db
    .prepare(
      'SELECT id, title, position FROM board_columns WHERE board_id = ? ORDER BY position ASC',
    )
    .all(id);

  const cardStmt = db.prepare(
    'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE column_id = ? ORDER BY position ASC',
  );
  const commentStmt = db.prepare(
    'SELECT id, card_id, content, author_name, created_at FROM comments WHERE card_id = ? ORDER BY created_at ASC',
  );

  const columnsWithCards = columns.map((col) => {
    const cards = cardStmt.all(col.id).map((card) => ({
      ...card,
      comments: commentStmt.all(card.id),
    }));
    return { ...col, cards };
  });

  return { ...board, columns: columnsWithCards };
}

export function createColumn(boardId, title) {
  const board = db.prepare('SELECT id FROM boards WHERE id = ?').get(boardId);
  if (!board) return null;
  const id = randomUUID();
  const max = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS m FROM board_columns WHERE board_id = ?',
    )
    .get(boardId).m;
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)',
  ).run(id, boardId, title, max + 1);
  return { id, board_id: boardId, title, position: max + 1, cards: [] };
}

export function addCard({ columnId, content, authorName }) {
  const col = db
    .prepare('SELECT id, board_id FROM board_columns WHERE id = ?')
    .get(columnId);
  if (!col) return null;
  const id = randomUUID();
  const now = Date.now();
  const max = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS m FROM cards WHERE column_id = ?')
    .get(columnId).m;
  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, columnId, content, authorName, max + 1, now);
  return {
    boardId: col.board_id,
    card: {
      id,
      column_id: columnId,
      content,
      author_name: authorName,
      position: max + 1,
      created_at: now,
      comments: [],
    },
  };
}

export function moveCard({ cardId, toColumnId, toPosition }) {
  const card = db
    .prepare(
      'SELECT c.id, c.column_id, bc.board_id FROM cards c JOIN board_columns bc ON bc.id = c.column_id WHERE c.id = ?',
    )
    .get(cardId);
  if (!card) return null;
  const target = db
    .prepare('SELECT id, board_id FROM board_columns WHERE id = ?')
    .get(toColumnId);
  if (!target || target.board_id !== card.board_id) return null;

  tx(() => {
    const original = db
      .prepare('SELECT position FROM cards WHERE id = ?')
      .get(cardId);
    // Park the card outside the position sequence so siblings can renumber.
    db.prepare('UPDATE cards SET position = -1 WHERE id = ?').run(cardId);

    if (card.column_id !== toColumnId) {
      db.prepare(
        'UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ?',
      ).run(card.column_id, original.position);
    }

    db.prepare(
      'UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ?',
    ).run(toColumnId, toPosition);

    db.prepare(
      'UPDATE cards SET column_id = ?, position = ? WHERE id = ?',
    ).run(toColumnId, toPosition, cardId);
  });

  return { boardId: card.board_id, cardId, toColumnId, toPosition };
}

export function addComment({ cardId, content, authorName }) {
  const card = db
    .prepare(
      'SELECT c.id, bc.board_id FROM cards c JOIN board_columns bc ON bc.id = c.column_id WHERE c.id = ?',
    )
    .get(cardId);
  if (!card) return null;
  const id = randomUUID();
  const now = Date.now();
  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, cardId, content, authorName, now);
  return {
    boardId: card.board_id,
    comment: {
      id,
      card_id: cardId,
      content,
      author_name: authorName,
      created_at: now,
    },
  };
}

export function exportBoardRows(boardId) {
  const board = db
    .prepare('SELECT id, title FROM boards WHERE id = ?')
    .get(boardId);
  if (!board) return null;
  return db
    .prepare(
      `SELECT
         bc.title AS column_title,
         c.content AS card_content,
         c.author_name AS card_author,
         c.created_at AS card_created_at,
         cm.content AS comment_content,
         cm.author_name AS comment_author,
         cm.created_at AS comment_created_at
       FROM board_columns bc
       LEFT JOIN cards c ON c.column_id = bc.id
       LEFT JOIN comments cm ON cm.card_id = c.id
       WHERE bc.board_id = ?
       ORDER BY bc.position ASC, c.position ASC, cm.created_at ASC`,
    )
    .all(boardId);
}
