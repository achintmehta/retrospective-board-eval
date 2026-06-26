import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

const DEFAULT_DB_PATH = path.resolve(process.cwd(), 'data', 'retro.db');
const DB_PATH = process.env.DB_PATH || DEFAULT_DB_PATH;

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

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
    board_id TEXT NOT NULL,
    title TEXT NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_columns_board ON board_columns(board_id);

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY (column_id) REFERENCES board_columns(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id);

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id);
`);

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

export function createBoard(title) {
  const id = randomUUID();
  const now = Date.now();
  const insertBoard = db.prepare(
    'INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)'
  );
  const insertColumn = db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  );

  const tx = db.prepare('BEGIN');
  const commit = db.prepare('COMMIT');
  const rollback = db.prepare('ROLLBACK');
  tx.run();
  try {
    insertBoard.run(id, title, now);
    DEFAULT_COLUMNS.forEach((columnTitle, idx) => {
      insertColumn.run(randomUUID(), id, columnTitle, idx);
    });
    commit.run();
  } catch (err) {
    rollback.run();
    throw err;
  }

  return getBoardSummary(id);
}

export function getBoardSummary(id) {
  return db
    .prepare('SELECT id, title, created_at FROM boards WHERE id = ?')
    .get(id);
}

export function listBoards() {
  return db
    .prepare('SELECT id, title, created_at FROM boards ORDER BY created_at DESC')
    .all();
}

export function getBoardFull(id) {
  const board = getBoardSummary(id);
  if (!board) return null;

  const columns = db
    .prepare(
      'SELECT id, title, position FROM board_columns WHERE board_id = ? ORDER BY position ASC, title ASC'
    )
    .all(id);

  const cards = db
    .prepare(
      `SELECT c.id, c.column_id, c.content, c.author_name, c.created_at, c.position
       FROM cards c
       JOIN board_columns col ON col.id = c.column_id
       WHERE col.board_id = ?
       ORDER BY c.position ASC, c.created_at ASC`
    )
    .all(id);

  const comments = db
    .prepare(
      `SELECT cm.id, cm.card_id, cm.content, cm.author_name, cm.created_at
       FROM comments cm
       JOIN cards c ON c.id = cm.card_id
       JOIN board_columns col ON col.id = c.column_id
       WHERE col.board_id = ?
       ORDER BY cm.created_at ASC`
    )
    .all(id);

  const commentsByCard = new Map();
  for (const cm of comments) {
    if (!commentsByCard.has(cm.card_id)) commentsByCard.set(cm.card_id, []);
    commentsByCard.get(cm.card_id).push(cm);
  }

  const cardsByColumn = new Map();
  for (const card of cards) {
    if (!cardsByColumn.has(card.column_id)) cardsByColumn.set(card.column_id, []);
    cardsByColumn.get(card.column_id).push({
      ...card,
      comments: commentsByCard.get(card.id) || [],
    });
  }

  return {
    ...board,
    columns: columns.map((col) => ({
      ...col,
      cards: cardsByColumn.get(col.id) || [],
    })),
  };
}

export function createColumn(boardId, title) {
  const board = getBoardSummary(boardId);
  if (!board) return null;

  const maxRow = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS max_pos FROM board_columns WHERE board_id = ?'
    )
    .get(boardId);
  const position = (maxRow?.max_pos ?? -1) + 1;
  const id = randomUUID();

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

export function createCard({ columnId, content, authorName }) {
  const column = getColumn(columnId);
  if (!column) return null;

  const maxRow = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS max_pos FROM cards WHERE column_id = ?'
    )
    .get(columnId);
  const position = (maxRow?.max_pos ?? -1) + 1;
  const id = randomUUID();
  const createdAt = Date.now();

  db.prepare(
    `INSERT INTO cards (id, column_id, content, author_name, created_at, position)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, columnId, content, authorName, createdAt, position);

  return {
    id,
    column_id: columnId,
    board_id: column.board_id,
    content,
    author_name: authorName,
    created_at: createdAt,
    position,
    comments: [],
  };
}

export function getCard(cardId) {
  return db
    .prepare(
      `SELECT c.id, c.column_id, c.content, c.author_name, c.created_at, c.position, col.board_id
       FROM cards c
       JOIN board_columns col ON col.id = c.column_id
       WHERE c.id = ?`
    )
    .get(cardId);
}

export function moveCard({ cardId, targetColumnId, targetIndex }) {
  const card = getCard(cardId);
  if (!card) return null;
  const targetColumn = getColumn(targetColumnId);
  if (!targetColumn) return null;
  if (targetColumn.board_id !== card.board_id) return null;

  const sameColumn = card.column_id === targetColumnId;

  const tx = db.prepare('BEGIN');
  const commit = db.prepare('COMMIT');
  const rollback = db.prepare('ROLLBACK');
  tx.run();
  try {
    if (sameColumn) {
      const siblings = db
        .prepare(
          'SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position ASC, created_at ASC'
        )
        .all(card.column_id, cardId);
      const ordered = [...siblings];
      const idx = clampIndex(targetIndex, ordered.length);
      ordered.splice(idx, 0, { id: cardId });
      const update = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
      ordered.forEach((c, i) => update.run(i, c.id));
    } else {
      const siblings = db
        .prepare(
          'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC, created_at ASC'
        )
        .all(targetColumnId);
      const idx = clampIndex(targetIndex, siblings.length);
      siblings.splice(idx, 0, { id: cardId });
      db.prepare('UPDATE cards SET column_id = ? WHERE id = ?').run(targetColumnId, cardId);
      const update = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
      siblings.forEach((c, i) => update.run(i, c.id));

      const sourceSiblings = db
        .prepare(
          'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC, created_at ASC'
        )
        .all(card.column_id);
      sourceSiblings.forEach((c, i) => update.run(i, c.id));
    }
    commit.run();
  } catch (err) {
    rollback.run();
    throw err;
  }

  return getCard(cardId);
}

function clampIndex(index, length) {
  if (!Number.isFinite(index) || index < 0) return length;
  if (index > length) return length;
  return Math.floor(index);
}

export function createComment({ cardId, content, authorName }) {
  const card = getCard(cardId);
  if (!card) return null;

  const id = randomUUID();
  const createdAt = Date.now();
  db.prepare(
    `INSERT INTO comments (id, card_id, content, author_name, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, cardId, content, authorName, createdAt);

  return {
    id,
    card_id: cardId,
    board_id: card.board_id,
    content,
    author_name: authorName,
    created_at: createdAt,
  };
}

export function getBoardExport(boardId) {
  const board = getBoardFull(boardId);
  if (!board) return null;
  const rows = [];
  for (const column of board.columns) {
    for (const card of column.cards) {
      if (card.comments.length === 0) {
        rows.push({
          column: column.title,
          card_content: card.content,
          card_author: card.author_name,
          card_created_at: new Date(card.created_at).toISOString(),
          comment_content: '',
          comment_author: '',
          comment_created_at: '',
        });
      } else {
        for (const comment of card.comments) {
          rows.push({
            column: column.title,
            card_content: card.content,
            card_author: card.author_name,
            card_created_at: new Date(card.created_at).toISOString(),
            comment_content: comment.content,
            comment_author: comment.author_name,
            comment_created_at: new Date(comment.created_at).toISOString(),
          });
        }
      }
    }
  }
  return { board, rows };
}
