import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { nanoid } from 'nanoid';

const DATA_DIR = process.env.DATA_DIR || resolve(process.cwd(), 'data');
const DB_PATH = process.env.DB_PATH || resolve(DATA_DIR, 'retro.sqlite');

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
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

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY (column_id) REFERENCES board_columns(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_columns_board ON board_columns(board_id);
  CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id);
  CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id);
`);

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

function nowMs() {
  return Date.now();
}

function newId() {
  return nanoid(12);
}

// ---------- Boards ----------

export function createBoard(title) {
  const id = newId();
  const createdAt = nowMs();
  const insertBoard = db.prepare(
    'INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)',
  );
  const insertColumn = db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)',
  );
  insertBoard.run(id, title, createdAt);
  DEFAULT_COLUMNS.forEach((colTitle, idx) => {
    insertColumn.run(newId(), id, colTitle, idx);
  });
  return getBoardSummary(id);
}

export function getBoardSummary(id) {
  const row = db
    .prepare('SELECT id, title, created_at FROM boards WHERE id = ?')
    .get(id);
  return row ? mapBoard(row) : null;
}

export function listBoards() {
  const rows = db
    .prepare('SELECT id, title, created_at FROM boards ORDER BY created_at DESC')
    .all();
  return rows.map(mapBoard);
}

export function getFullBoard(id) {
  const board = getBoardSummary(id);
  if (!board) return null;

  const columns = db
    .prepare(
      'SELECT id, board_id, title, position FROM board_columns WHERE board_id = ? ORDER BY position ASC',
    )
    .all(id)
    .map(mapColumn);

  if (columns.length === 0) {
    return { ...board, columns: [] };
  }

  const columnIds = columns.map((c) => c.id);
  const placeholders = columnIds.map(() => '?').join(',');

  const cards = db
    .prepare(
      `SELECT id, column_id, content, author_name, created_at, position
       FROM cards WHERE column_id IN (${placeholders})
       ORDER BY position ASC`,
    )
    .all(...columnIds)
    .map(mapCard);

  let comments = [];
  if (cards.length > 0) {
    const cardIds = cards.map((c) => c.id);
    const cardPlaceholders = cardIds.map(() => '?').join(',');
    comments = db
      .prepare(
        `SELECT id, card_id, content, author_name, created_at
         FROM comments WHERE card_id IN (${cardPlaceholders})
         ORDER BY created_at ASC`,
      )
      .all(...cardIds)
      .map(mapComment);
  }

  const commentsByCard = new Map();
  comments.forEach((c) => {
    if (!commentsByCard.has(c.cardId)) commentsByCard.set(c.cardId, []);
    commentsByCard.get(c.cardId).push(c);
  });

  const cardsByColumn = new Map();
  cards.forEach((card) => {
    if (!cardsByColumn.has(card.columnId)) cardsByColumn.set(card.columnId, []);
    cardsByColumn
      .get(card.columnId)
      .push({ ...card, comments: commentsByCard.get(card.id) || [] });
  });

  return {
    ...board,
    columns: columns.map((col) => ({
      ...col,
      cards: cardsByColumn.get(col.id) || [],
    })),
  };
}

// ---------- Columns ----------

export function createColumn(boardId, title) {
  const board = getBoardSummary(boardId);
  if (!board) return null;
  const maxPos = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS max_pos FROM board_columns WHERE board_id = ?',
    )
    .get(boardId);
  const position = (maxPos?.max_pos ?? -1) + 1;
  const id = newId();
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)',
  ).run(id, boardId, title, position);
  return mapColumn({ id, board_id: boardId, title, position });
}

export function getColumn(columnId) {
  const row = db
    .prepare(
      'SELECT id, board_id, title, position FROM board_columns WHERE id = ?',
    )
    .get(columnId);
  return row ? mapColumn(row) : null;
}

// ---------- Cards ----------

export function createCard({ columnId, content, authorName }) {
  const column = getColumn(columnId);
  if (!column) return null;
  const maxPos = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS max_pos FROM cards WHERE column_id = ?',
    )
    .get(columnId);
  const position = (maxPos?.max_pos ?? -1) + 1;
  const id = newId();
  const createdAt = nowMs();
  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, created_at, position) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, columnId, content, authorName, createdAt, position);
  return {
    ...mapCard({
      id,
      column_id: columnId,
      content,
      author_name: authorName,
      created_at: createdAt,
      position,
    }),
    boardId: column.boardId,
  };
}

export function moveCard({ cardId, targetColumnId, targetPosition }) {
  const card = db
    .prepare(
      'SELECT id, column_id, content, author_name, created_at, position FROM cards WHERE id = ?',
    )
    .get(cardId);
  if (!card) return null;
  const targetColumn = getColumn(targetColumnId);
  if (!targetColumn) return null;

  const fromColumnId = card.column_id;
  const toColumnId = targetColumnId;

  const tx = db.prepare('BEGIN');
  const commit = db.prepare('COMMIT');
  const rollback = db.prepare('ROLLBACK');

  tx.run();
  try {
    if (fromColumnId === toColumnId) {
      const cards = db
        .prepare(
          'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC',
        )
        .all(toColumnId)
        .map((r) => r.id)
        .filter((id) => id !== cardId);
      const insertAt = clamp(targetPosition, 0, cards.length);
      cards.splice(insertAt, 0, cardId);
      const update = db.prepare(
        'UPDATE cards SET position = ? WHERE id = ?',
      );
      cards.forEach((id, idx) => update.run(idx, id));
    } else {
      const fromCards = db
        .prepare(
          'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC',
        )
        .all(fromColumnId)
        .map((r) => r.id)
        .filter((id) => id !== cardId);
      const toCards = db
        .prepare(
          'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC',
        )
        .all(toColumnId)
        .map((r) => r.id);

      const insertAt = clamp(targetPosition, 0, toCards.length);
      toCards.splice(insertAt, 0, cardId);

      db.prepare('UPDATE cards SET column_id = ? WHERE id = ?').run(
        toColumnId,
        cardId,
      );

      const update = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
      fromCards.forEach((id, idx) => update.run(idx, id));
      toCards.forEach((id, idx) => update.run(idx, id));
    }
    commit.run();
  } catch (err) {
    rollback.run();
    throw err;
  }

  const updatedCard = db
    .prepare(
      'SELECT id, column_id, content, author_name, created_at, position FROM cards WHERE id = ?',
    )
    .get(cardId);
  return {
    ...mapCard(updatedCard),
    fromColumnId,
    boardId: targetColumn.boardId,
  };
}

export function getCard(cardId) {
  const row = db
    .prepare(
      'SELECT id, column_id, content, author_name, created_at, position FROM cards WHERE id = ?',
    )
    .get(cardId);
  return row ? mapCard(row) : null;
}

// ---------- Comments ----------

export function createComment({ cardId, content, authorName }) {
  const card = getCard(cardId);
  if (!card) return null;
  const column = getColumn(card.columnId);
  const id = newId();
  const createdAt = nowMs();
  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, cardId, content, authorName, createdAt);
  return {
    id,
    cardId,
    content,
    authorName,
    createdAt,
    boardId: column?.boardId,
  };
}

export function getCommentsForCard(cardId) {
  return db
    .prepare(
      'SELECT id, card_id, content, author_name, created_at FROM comments WHERE card_id = ? ORDER BY created_at ASC',
    )
    .all(cardId)
    .map(mapComment);
}

// ---------- Helpers ----------

function clamp(value, min, max) {
  const v = Number.isFinite(value) ? value : max;
  return Math.max(min, Math.min(max, v));
}

function mapBoard(row) {
  return { id: row.id, title: row.title, createdAt: row.created_at };
}

function mapColumn(row) {
  return {
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    position: row.position,
  };
}

function mapCard(row) {
  return {
    id: row.id,
    columnId: row.column_id,
    content: row.content,
    authorName: row.author_name,
    createdAt: row.created_at,
    position: row.position,
  };
}

function mapComment(row) {
  return {
    id: row.id,
    cardId: row.card_id,
    content: row.content,
    authorName: row.author_name,
    createdAt: row.created_at,
  };
}

export { db };
