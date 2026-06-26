const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DEFAULT_DB_PATH = path.join(__dirname, '..', 'data', 'retro.db');
const dbPath = process.env.DB_PATH || DEFAULT_DB_PATH;

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

function tx(fn) {
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

function uid() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

function createBoard(title) {
  const id = uid();
  const now = Date.now();
  tx(() => {
    db.prepare('INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)').run(id, title, now);
    const insertCol = db.prepare(
      'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
    );
    DEFAULT_COLUMNS.forEach((colTitle, idx) => {
      insertCol.run(uid(), id, colTitle, idx);
    });
  });
  return getBoard(id);
}

function listBoards() {
  return db
    .prepare('SELECT id, title, created_at FROM boards ORDER BY created_at DESC')
    .all();
}

function getBoardMeta(boardId) {
  return db
    .prepare('SELECT id, title, created_at FROM boards WHERE id = ?')
    .get(boardId);
}

function getBoard(boardId) {
  const board = getBoardMeta(boardId);
  if (!board) return null;

  const columns = db
    .prepare(
      'SELECT id, board_id, title, position FROM board_columns WHERE board_id = ? ORDER BY position ASC'
    )
    .all(boardId);

  const columnIds = columns.map((c) => c.id);
  const cards = columnIds.length
    ? db
        .prepare(
          `SELECT id, column_id, content, author_name, created_at, position
           FROM cards
           WHERE column_id IN (${columnIds.map(() => '?').join(',')})
           ORDER BY position ASC`
        )
        .all(...columnIds)
    : [];

  const cardIds = cards.map((c) => c.id);
  const comments = cardIds.length
    ? db
        .prepare(
          `SELECT id, card_id, content, author_name, created_at
           FROM comments
           WHERE card_id IN (${cardIds.map(() => '?').join(',')})
           ORDER BY created_at ASC`
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

function createColumn(boardId, title) {
  const board = getBoardMeta(boardId);
  if (!board) return null;
  const id = uid();
  const positionRow = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS maxPos FROM board_columns WHERE board_id = ?')
    .get(boardId);
  const position = (positionRow?.maxPos ?? -1) + 1;
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  ).run(id, boardId, title, position);
  return { id, board_id: boardId, title, position, cards: [] };
}

function getColumn(columnId) {
  return db
    .prepare('SELECT id, board_id, title, position FROM board_columns WHERE id = ?')
    .get(columnId);
}

function createCard({ columnId, content, authorName }) {
  const column = getColumn(columnId);
  if (!column) return null;
  const id = uid();
  const now = Date.now();
  const positionRow = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS maxPos FROM cards WHERE column_id = ?')
    .get(columnId);
  const position = (positionRow?.maxPos ?? -1) + 1;
  db.prepare(
    `INSERT INTO cards (id, column_id, content, author_name, created_at, position)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, columnId, content, authorName, now, position);
  return {
    id,
    column_id: columnId,
    content,
    author_name: authorName,
    created_at: now,
    position,
    board_id: column.board_id,
    comments: [],
  };
}

function getCard(cardId) {
  return db
    .prepare(
      'SELECT id, column_id, content, author_name, created_at, position FROM cards WHERE id = ?'
    )
    .get(cardId);
}

function moveCard({ cardId, toColumnId, toIndex }) {
  const card = getCard(cardId);
  if (!card) return null;
  const targetColumn = getColumn(toColumnId);
  if (!targetColumn) return null;

  const fromColumnId = card.column_id;
  tx(() => {
    if (fromColumnId === toColumnId) {
      const cards = db
        .prepare('SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC')
        .all(toColumnId)
        .map((c) => c.id);
      const without = cards.filter((id) => id !== cardId);
      const clamped = Math.max(0, Math.min(toIndex, without.length));
      without.splice(clamped, 0, cardId);
      const update = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
      without.forEach((id, idx) => update.run(idx, id));
    } else {
      const sourceCards = db
        .prepare('SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position ASC')
        .all(fromColumnId, cardId)
        .map((c) => c.id);
      const targetCards = db
        .prepare('SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC')
        .all(toColumnId)
        .map((c) => c.id);
      const clamped = Math.max(0, Math.min(toIndex, targetCards.length));
      targetCards.splice(clamped, 0, cardId);

      db.prepare('UPDATE cards SET column_id = ? WHERE id = ?').run(toColumnId, cardId);

      const update = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
      sourceCards.forEach((id, idx) => update.run(idx, id));
      targetCards.forEach((id, idx) => update.run(idx, id));
    }
  });

  const updated = getCard(cardId);
  return {
    from_column_id: fromColumnId,
    to_column_id: toColumnId,
    card: updated,
    board_id: targetColumn.board_id,
  };
}

function createComment({ cardId, content, authorName }) {
  const card = getCard(cardId);
  if (!card) return null;
  const column = getColumn(card.column_id);
  const id = uid();
  const now = Date.now();
  db.prepare(
    `INSERT INTO comments (id, card_id, content, author_name, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, cardId, content, authorName, now);
  return {
    id,
    card_id: cardId,
    content,
    author_name: authorName,
    created_at: now,
    board_id: column?.board_id,
  };
}

function getBoardIdForCard(cardId) {
  const row = db
    .prepare(
      `SELECT c.board_id AS board_id
       FROM cards ca
       JOIN board_columns c ON ca.column_id = c.id
       WHERE ca.id = ?`
    )
    .get(cardId);
  return row?.board_id || null;
}

function getBoardIdForColumn(columnId) {
  const row = db
    .prepare('SELECT board_id FROM board_columns WHERE id = ?')
    .get(columnId);
  return row?.board_id || null;
}

module.exports = {
  db,
  createBoard,
  listBoards,
  getBoard,
  getBoardMeta,
  createColumn,
  createCard,
  moveCard,
  createComment,
  getBoardIdForCard,
  getBoardIdForColumn,
};
