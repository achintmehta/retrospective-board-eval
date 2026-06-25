import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'retro.sqlite');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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
  CREATE INDEX IF NOT EXISTS idx_columns_board ON board_columns(board_id);

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    position INTEGER NOT NULL
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

const now = () => Date.now();

export function createBoard(title) {
  const id = randomUUID();
  const created_at = now();
  db.prepare('INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)').run(id, title, created_at);

  // Seed three default columns so the board is immediately usable.
  const defaults = ['Went Well', 'Needs Improvement', 'Action Items'];
  const insertCol = db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  );
  defaults.forEach((title, idx) => insertCol.run(randomUUID(), id, title, idx));

  return getBoard(id);
}

export function listBoards() {
  return db.prepare('SELECT id, title, created_at FROM boards ORDER BY created_at DESC').all();
}

export function getBoard(id) {
  const board = db.prepare('SELECT id, title, created_at FROM boards WHERE id = ?').get(id);
  if (!board) return null;
  const columns = db
    .prepare('SELECT id, board_id, title, position FROM board_columns WHERE board_id = ? ORDER BY position ASC')
    .all(id);
  const colIds = columns.map((c) => c.id);
  const cards = colIds.length
    ? db
        .prepare(
          `SELECT id, column_id, content, author_name, created_at, position FROM cards
           WHERE column_id IN (${colIds.map(() => '?').join(',')})
           ORDER BY position ASC`
        )
        .all(...colIds)
    : [];
  const cardIds = cards.map((c) => c.id);
  const comments = cardIds.length
    ? db
        .prepare(
          `SELECT id, card_id, content, author_name, created_at FROM comments
           WHERE card_id IN (${cardIds.map(() => '?').join(',')})
           ORDER BY created_at ASC`
        )
        .all(...cardIds)
    : [];

  const cardsByColumn = new Map(columns.map((c) => [c.id, []]));
  const commentsByCard = new Map(cards.map((c) => [c.id, []]));
  for (const comment of comments) commentsByCard.get(comment.card_id).push(comment);
  for (const card of cards) {
    card.comments = commentsByCard.get(card.id) || [];
    cardsByColumn.get(card.column_id).push(card);
  }
  for (const col of columns) col.cards = cardsByColumn.get(col.id) || [];

  return { ...board, columns };
}

export function createColumn(boardId, title) {
  const board = db.prepare('SELECT id FROM boards WHERE id = ?').get(boardId);
  if (!board) return null;
  const id = randomUUID();
  const max = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS m FROM board_columns WHERE board_id = ?')
    .get(boardId).m;
  const position = max + 1;
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  ).run(id, boardId, title, position);
  return { id, board_id: boardId, title, position, cards: [] };
}

export function getColumn(columnId) {
  return db
    .prepare('SELECT id, board_id, title, position FROM board_columns WHERE id = ?')
    .get(columnId);
}

export function addCard({ columnId, content, authorName }) {
  const col = getColumn(columnId);
  if (!col) return null;
  const id = randomUUID();
  const created_at = now();
  const max = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS m FROM cards WHERE column_id = ?')
    .get(columnId).m;
  const position = max + 1;
  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, created_at, position) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, columnId, content, authorName, created_at, position);
  return {
    id,
    column_id: columnId,
    content,
    author_name: authorName,
    created_at,
    position,
    board_id: col.board_id,
    comments: [],
  };
}

const moveCardTxn = db.transaction(({ cardId, toColumnId, toIndex }) => {
  const card = db
    .prepare('SELECT id, column_id, position FROM cards WHERE id = ?')
    .get(cardId);
  if (!card) return null;
  const toCol = db
    .prepare('SELECT id, board_id FROM board_columns WHERE id = ?')
    .get(toColumnId);
  if (!toCol) return null;

  // Remove from source: shift positions down for items after the moved card.
  db.prepare(
    'UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ?'
  ).run(card.column_id, card.position);

  // Make room in destination at toIndex.
  const destCount = db
    .prepare('SELECT COUNT(*) AS c FROM cards WHERE column_id = ?')
    .get(toColumnId).c;
  const finalIndex = Math.max(0, Math.min(toIndex, destCount));

  db.prepare(
    'UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ?'
  ).run(toColumnId, finalIndex);

  db.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?').run(
    toColumnId,
    finalIndex,
    cardId
  );

  return {
    cardId,
    fromColumnId: card.column_id,
    toColumnId,
    toIndex: finalIndex,
    boardId: toCol.board_id,
  };
});

export function moveCard(args) {
  return moveCardTxn(args);
}

export function addComment({ cardId, content, authorName }) {
  const card = db
    .prepare(
      `SELECT cards.id, cards.column_id, board_columns.board_id AS board_id
       FROM cards
       JOIN board_columns ON board_columns.id = cards.column_id
       WHERE cards.id = ?`
    )
    .get(cardId);
  if (!card) return null;
  const id = randomUUID();
  const created_at = now();
  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, cardId, content, authorName, created_at);
  return {
    id,
    card_id: cardId,
    content,
    author_name: authorName,
    created_at,
    board_id: card.board_id,
  };
}

export function getBoardExportRows(boardId) {
  return db
    .prepare(
      `SELECT
         board_columns.title AS column_title,
         board_columns.position AS column_position,
         cards.content AS card_content,
         cards.author_name AS card_author,
         cards.created_at AS card_created_at,
         comments.content AS comment_content,
         comments.author_name AS comment_author,
         comments.created_at AS comment_created_at
       FROM board_columns
       LEFT JOIN cards ON cards.column_id = board_columns.id
       LEFT JOIN comments ON comments.card_id = cards.id
       WHERE board_columns.board_id = ?
       ORDER BY board_columns.position ASC, cards.position ASC, comments.created_at ASC`
    )
    .all(boardId);
}
