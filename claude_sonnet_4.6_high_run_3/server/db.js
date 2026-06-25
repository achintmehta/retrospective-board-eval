import { DatabaseSync } from 'node:sqlite';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || join(__dirname, '..', 'data', 'retro.db');

import { mkdirSync } from 'node:fs';
mkdirSync(dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

db.exec(`PRAGMA journal_mode = WAL`);

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

export function getBoards() {
  return db.prepare(`SELECT * FROM boards ORDER BY created_at DESC`).all();
}

export function getBoardById(id) {
  const board = db.prepare(`SELECT * FROM boards WHERE id = ?`).get(id);
  if (!board) return null;

  const columns = db.prepare(`SELECT * FROM board_columns WHERE board_id = ? ORDER BY position`).all(id);

  for (const col of columns) {
    const cards = db.prepare(`SELECT * FROM cards WHERE column_id = ? ORDER BY position`).all(col.id);
    for (const card of cards) {
      card.comments = db.prepare(`SELECT * FROM comments WHERE card_id = ? ORDER BY created_at`).all(card.id);
    }
    col.cards = cards;
  }

  board.columns = columns;
  return board;
}

export function createBoard(id, title) {
  db.prepare(`INSERT INTO boards (id, title) VALUES (?, ?)`).run(id, title);
  return db.prepare(`SELECT * FROM boards WHERE id = ?`).get(id);
}

export function createColumn(id, boardId, title, position) {
  db.prepare(`INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)`).run(id, boardId, title, position);
  return db.prepare(`SELECT * FROM board_columns WHERE id = ?`).get(id);
}

export function createCard(id, columnId, content, authorName, position) {
  db.prepare(`INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)`).run(id, columnId, content, authorName, position);
  return db.prepare(`SELECT * FROM cards WHERE id = ?`).get(id);
}

export function moveCard(cardId, newColumnId, newPosition) {
  db.prepare(`UPDATE cards SET column_id = ?, position = ? WHERE id = ?`).run(newColumnId, newPosition, cardId);
  return db.prepare(`SELECT * FROM cards WHERE id = ?`).get(cardId);
}

export function createComment(id, cardId, content, authorName) {
  db.prepare(`INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)`).run(id, cardId, content, authorName);
  return db.prepare(`SELECT * FROM comments WHERE id = ?`).get(id);
}

export function getBoardForExport(boardId) {
  const board = db.prepare(`SELECT * FROM boards WHERE id = ?`).get(boardId);
  if (!board) return null;

  const rows = db.prepare(`
    SELECT
      b.title AS board_title,
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
    JOIN boards b ON b.id = bc.board_id
    WHERE bc.board_id = ?
    ORDER BY bc.position, c.position, cm.created_at
  `).all(boardId);

  return { board, rows };
}

export default db;
