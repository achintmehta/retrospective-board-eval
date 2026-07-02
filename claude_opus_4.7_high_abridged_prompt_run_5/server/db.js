import { DatabaseSync } from 'node:sqlite';
import { nanoid } from 'nanoid';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_FILE = path.join(DATA_DIR, 'retro.sqlite');
export const db = new DatabaseSync(DB_FILE);
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
    color TEXT
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

const now = () => Date.now();
const id = () => nanoid(12);

const DEFAULT_COLUMNS = [
  { title: 'Went Well', color: '#22c55e' },
  { title: 'Needs Improvement', color: '#f59e0b' },
  { title: 'Action Items', color: '#8b5cf6' },
];

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

export function createBoard(title) {
  const boardId = id();
  const createdAt = now();
  const insertBoard = db.prepare(
    'INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)'
  );
  const insertColumn = db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, color) VALUES (?, ?, ?, ?, ?)'
  );
  transaction(() => {
    insertBoard.run(boardId, title, createdAt);
    DEFAULT_COLUMNS.forEach((col, i) => {
      insertColumn.run(id(), boardId, col.title, i, col.color);
    });
  });
  return getBoard(boardId);
}

export function listBoards() {
  const boards = db
    .prepare('SELECT id, title, created_at FROM boards ORDER BY created_at DESC')
    .all();
  const countCards = db.prepare(
    `SELECT COUNT(*) AS n FROM cards c
     JOIN board_columns bc ON bc.id = c.column_id
     WHERE bc.board_id = ?`
  );
  return boards.map((b) => ({
    ...b,
    cardCount: countCards.get(b.id).n,
  }));
}

export function getBoard(boardId) {
  const board = db
    .prepare('SELECT id, title, created_at FROM boards WHERE id = ?')
    .get(boardId);
  if (!board) return null;

  const columns = db
    .prepare(
      'SELECT id, board_id, title, position, color FROM board_columns WHERE board_id = ? ORDER BY position ASC'
    )
    .all(boardId);

  const cardsStmt = db.prepare(
    'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE column_id = ? ORDER BY position ASC'
  );
  const commentsStmt = db.prepare(
    'SELECT id, card_id, content, author_name, created_at FROM comments WHERE card_id = ? ORDER BY created_at ASC'
  );

  const enrichedColumns = columns.map((col) => {
    const cards = cardsStmt.all(col.id).map((card) => ({
      ...card,
      comments: commentsStmt.all(card.id),
    }));
    return { ...col, cards };
  });

  return { ...board, columns: enrichedColumns };
}

export function createColumn(boardId, title, color) {
  const boardExists = db
    .prepare('SELECT 1 FROM boards WHERE id = ?')
    .get(boardId);
  if (!boardExists) return null;
  const maxPos = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS p FROM board_columns WHERE board_id = ?'
    )
    .get(boardId).p;
  const columnId = id();
  const position = maxPos + 1;
  const finalColor = color || '#6366f1';
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, color) VALUES (?, ?, ?, ?, ?)'
  ).run(columnId, boardId, title, position, finalColor);
  return {
    id: columnId,
    board_id: boardId,
    title,
    position,
    color: finalColor,
    cards: [],
  };
}

export function createCard(columnId, content, authorName) {
  const column = db
    .prepare('SELECT board_id FROM board_columns WHERE id = ?')
    .get(columnId);
  if (!column) return null;
  const maxPos = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS p FROM cards WHERE column_id = ?'
    )
    .get(columnId).p;
  const cardId = id();
  const createdAt = now();
  const position = maxPos + 1;
  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(cardId, columnId, content, authorName, position, createdAt);
  return {
    card: {
      id: cardId,
      column_id: columnId,
      content,
      author_name: authorName,
      position,
      created_at: createdAt,
      comments: [],
    },
    boardId: column.board_id,
  };
}

export function moveCard(cardId, toColumnId, toPosition) {
  const card = db
    .prepare('SELECT column_id, position FROM cards WHERE id = ?')
    .get(cardId);
  if (!card) return null;
  const targetColumn = db
    .prepare('SELECT board_id FROM board_columns WHERE id = ?')
    .get(toColumnId);
  if (!targetColumn) return null;

  const fromColumnId = card.column_id;
  const fromPosition = card.position;

  transaction(() => {
    if (fromColumnId === toColumnId) {
      if (fromPosition === toPosition) return;
      if (fromPosition < toPosition) {
        db.prepare(
          `UPDATE cards SET position = position - 1
           WHERE column_id = ? AND position > ? AND position <= ?`
        ).run(fromColumnId, fromPosition, toPosition);
      } else {
        db.prepare(
          `UPDATE cards SET position = position + 1
           WHERE column_id = ? AND position >= ? AND position < ?`
        ).run(fromColumnId, toPosition, fromPosition);
      }
      db.prepare('UPDATE cards SET position = ? WHERE id = ?').run(
        toPosition,
        cardId
      );
    } else {
      db.prepare(
        `UPDATE cards SET position = position - 1
         WHERE column_id = ? AND position > ?`
      ).run(fromColumnId, fromPosition);
      db.prepare(
        `UPDATE cards SET position = position + 1
         WHERE column_id = ? AND position >= ?`
      ).run(toColumnId, toPosition);
      db.prepare(
        'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
      ).run(toColumnId, toPosition, cardId);
    }
  });

  return {
    cardId,
    fromColumnId,
    toColumnId,
    toPosition,
    boardId: targetColumn.board_id,
  };
}

export function createComment(cardId, content, authorName) {
  const card = db
    .prepare(
      `SELECT bc.board_id FROM cards c
       JOIN board_columns bc ON bc.id = c.column_id
       WHERE c.id = ?`
    )
    .get(cardId);
  if (!card) return null;
  const commentId = id();
  const createdAt = now();
  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(commentId, cardId, content, authorName, createdAt);
  return {
    comment: {
      id: commentId,
      card_id: cardId,
      content,
      author_name: authorName,
      created_at: createdAt,
    },
    boardId: card.board_id,
  };
}

export function getBoardExportRows(boardId) {
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
       ORDER BY bc.position ASC, c.position ASC, cm.created_at ASC`
    )
    .all(boardId);
}

export function boardExists(boardId) {
  return !!db.prepare('SELECT 1 FROM boards WHERE id = ?').get(boardId);
}
