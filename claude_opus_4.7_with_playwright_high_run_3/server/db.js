const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'retro.sqlite');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
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
  CREATE INDEX IF NOT EXISTS idx_board_columns_board_id ON board_columns(board_id);

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    position INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_cards_column_id ON cards(column_id);

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_comments_card_id ON comments(card_id);
`);

function newId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

const createBoard = db.transaction((title) => {
  const id = newId();
  const now = Date.now();
  db.prepare('INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)').run(id, title, now);

  const insertColumn = db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  );
  DEFAULT_COLUMNS.forEach((colTitle, i) => {
    insertColumn.run(newId(), id, colTitle, i);
  });

  return getBoardById(id);
});

function listBoards() {
  return db
    .prepare('SELECT id, title, created_at AS createdAt FROM boards ORDER BY created_at DESC')
    .all();
}

function getBoardById(id) {
  const board = db
    .prepare('SELECT id, title, created_at AS createdAt FROM boards WHERE id = ?')
    .get(id);
  if (!board) return null;

  const columns = db
    .prepare(
      'SELECT id, board_id AS boardId, title, position FROM board_columns WHERE board_id = ? ORDER BY position ASC'
    )
    .all(id);

  const columnIds = columns.map((c) => c.id);
  const cards = columnIds.length
    ? db
        .prepare(
          `SELECT id, column_id AS columnId, content, author_name AS authorName,
                  created_at AS createdAt, position
           FROM cards WHERE column_id IN (${columnIds.map(() => '?').join(',')})
           ORDER BY position ASC`
        )
        .all(...columnIds)
    : [];

  const cardIds = cards.map((c) => c.id);
  const comments = cardIds.length
    ? db
        .prepare(
          `SELECT id, card_id AS cardId, content, author_name AS authorName, created_at AS createdAt
           FROM comments WHERE card_id IN (${cardIds.map(() => '?').join(',')})
           ORDER BY created_at ASC`
        )
        .all(...cardIds)
    : [];

  const commentsByCard = {};
  for (const c of comments) {
    (commentsByCard[c.cardId] ||= []).push(c);
  }

  const cardsByColumn = {};
  for (const card of cards) {
    card.comments = commentsByCard[card.id] || [];
    (cardsByColumn[card.columnId] ||= []).push(card);
  }

  for (const column of columns) {
    column.cards = cardsByColumn[column.id] || [];
  }

  board.columns = columns;
  return board;
}

function createColumn(boardId, title) {
  const board = db.prepare('SELECT id FROM boards WHERE id = ?').get(boardId);
  if (!board) return null;

  const max = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS max FROM board_columns WHERE board_id = ?')
    .get(boardId).max;
  const id = newId();
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  ).run(id, boardId, title, max + 1);

  return db
    .prepare(
      'SELECT id, board_id AS boardId, title, position FROM board_columns WHERE id = ?'
    )
    .get(id);
}

function addCard({ columnId, content, authorName }) {
  const column = db
    .prepare('SELECT id, board_id AS boardId FROM board_columns WHERE id = ?')
    .get(columnId);
  if (!column) return null;

  const max = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS max FROM cards WHERE column_id = ?')
    .get(columnId).max;
  const id = newId();
  const now = Date.now();
  db.prepare(
    `INSERT INTO cards (id, column_id, content, author_name, created_at, position)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, columnId, content, authorName, now, max + 1);

  const card = db
    .prepare(
      `SELECT id, column_id AS columnId, content, author_name AS authorName,
              created_at AS createdAt, position FROM cards WHERE id = ?`
    )
    .get(id);
  card.comments = [];
  return { card, boardId: column.boardId };
}

const moveCard = db.transaction(({ cardId, newColumnId, newPosition }) => {
  const card = db
    .prepare('SELECT id, column_id AS columnId, position FROM cards WHERE id = ?')
    .get(cardId);
  if (!card) return null;

  const targetColumn = db
    .prepare('SELECT id, board_id AS boardId FROM board_columns WHERE id = ?')
    .get(newColumnId);
  if (!targetColumn) return null;

  // Remove from source: shift remaining cards up.
  db.prepare(
    'UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ?'
  ).run(card.columnId, card.position);

  // Make space in destination at newPosition.
  const destCount = db
    .prepare('SELECT COUNT(*) AS n FROM cards WHERE column_id = ?')
    .get(newColumnId).n;
  const targetPos = Math.max(0, Math.min(newPosition, destCount));
  db.prepare(
    'UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ?'
  ).run(newColumnId, targetPos);

  db.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?').run(
    newColumnId,
    targetPos,
    cardId
  );

  return {
    cardId,
    newColumnId,
    newPosition: targetPos,
    oldColumnId: card.columnId,
    boardId: targetColumn.boardId,
  };
});

function addComment({ cardId, content, authorName }) {
  const card = db
    .prepare(
      `SELECT cards.id, board_columns.board_id AS boardId
       FROM cards JOIN board_columns ON cards.column_id = board_columns.id
       WHERE cards.id = ?`
    )
    .get(cardId);
  if (!card) return null;

  const id = newId();
  const now = Date.now();
  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, cardId, content, authorName, now);

  const comment = db
    .prepare(
      `SELECT id, card_id AS cardId, content, author_name AS authorName, created_at AS createdAt
       FROM comments WHERE id = ?`
    )
    .get(id);
  return { comment, boardId: card.boardId };
}

module.exports = {
  db,
  newId,
  createBoard,
  listBoards,
  getBoardById,
  createColumn,
  addCard,
  moveCard,
  addComment,
};
