import { DatabaseSync } from 'node:sqlite';
import { nanoid } from 'nanoid';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'retro.sqlite');
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS board_columns (
    id       TEXT PRIMARY KEY,
    board_id TEXT NOT NULL,
    title    TEXT NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_columns_board ON board_columns(board_id);

  CREATE TABLE IF NOT EXISTS cards (
    id          TEXT PRIMARY KEY,
    column_id   TEXT NOT NULL,
    content     TEXT NOT NULL,
    author_name TEXT NOT NULL,
    position    INTEGER NOT NULL,
    created_at  INTEGER NOT NULL,
    FOREIGN KEY (column_id) REFERENCES board_columns(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id);

  CREATE TABLE IF NOT EXISTS comments (
    id          TEXT PRIMARY KEY,
    card_id     TEXT NOT NULL,
    content     TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at  INTEGER NOT NULL,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id);
`);

const now = () => Date.now();
const newId = (prefix) => `${prefix}_${nanoid(12)}`;

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

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

export function createBoard({ title }) {
  const id = newId('brd');
  const created_at = now();
  const insertBoard = db.prepare(
    'INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)',
  );
  const insertColumn = db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)',
  );
  tx(() => {
    insertBoard.run(id, title, created_at);
    DEFAULT_COLUMNS.forEach((colTitle, idx) => {
      insertColumn.run(newId('col'), id, colTitle, idx);
    });
  });
  return getBoardSummary(id);
}

export function listBoards() {
  const rows = db
    .prepare(
      `SELECT b.id, b.title, b.created_at,
              (SELECT COUNT(*) FROM cards c
                 JOIN board_columns bc ON bc.id = c.column_id
                 WHERE bc.board_id = b.id) AS card_count
         FROM boards b
        ORDER BY b.created_at DESC`,
    )
    .all();
  return rows;
}

export function getBoardSummary(boardId) {
  return db
    .prepare('SELECT id, title, created_at FROM boards WHERE id = ?')
    .get(boardId);
}

export function getBoard(boardId) {
  const board = getBoardSummary(boardId);
  if (!board) return null;
  const columns = db
    .prepare(
      'SELECT id, title, position FROM board_columns WHERE board_id = ? ORDER BY position ASC',
    )
    .all(boardId);
  const cards = db
    .prepare(
      `SELECT c.id, c.column_id, c.content, c.author_name, c.position, c.created_at
         FROM cards c
         JOIN board_columns bc ON bc.id = c.column_id
        WHERE bc.board_id = ?
        ORDER BY c.position ASC`,
    )
    .all(boardId);
  const comments = db
    .prepare(
      `SELECT cm.id, cm.card_id, cm.content, cm.author_name, cm.created_at
         FROM comments cm
         JOIN cards c ON c.id = cm.card_id
         JOIN board_columns bc ON bc.id = c.column_id
        WHERE bc.board_id = ?
        ORDER BY cm.created_at ASC`,
    )
    .all(boardId);

  const commentsByCard = new Map();
  for (const cm of comments) {
    if (!commentsByCard.has(cm.card_id)) commentsByCard.set(cm.card_id, []);
    commentsByCard.get(cm.card_id).push(cm);
  }
  const cardsWithComments = cards.map((c) => ({
    ...c,
    comments: commentsByCard.get(c.id) ?? [],
  }));
  const cardsByColumn = new Map();
  for (const c of cardsWithComments) {
    if (!cardsByColumn.has(c.column_id)) cardsByColumn.set(c.column_id, []);
    cardsByColumn.get(c.column_id).push(c);
  }
  const columnsWithCards = columns.map((col) => ({
    ...col,
    cards: cardsByColumn.get(col.id) ?? [],
  }));
  return { ...board, columns: columnsWithCards };
}

export function createColumn({ boardId, title }) {
  const board = getBoardSummary(boardId);
  if (!board) return null;
  const nextPos =
    db
      .prepare(
        'SELECT COALESCE(MAX(position) + 1, 0) AS pos FROM board_columns WHERE board_id = ?',
      )
      .get(boardId).pos;
  const id = newId('col');
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)',
  ).run(id, boardId, title, nextPos);
  return { id, board_id: boardId, title, position: nextPos, cards: [] };
}

export function addCard({ columnId, content, authorName }) {
  const column = db
    .prepare('SELECT id, board_id FROM board_columns WHERE id = ?')
    .get(columnId);
  if (!column) return null;
  const pos =
    db
      .prepare(
        'SELECT COALESCE(MAX(position) + 1, 0) AS pos FROM cards WHERE column_id = ?',
      )
      .get(columnId).pos;
  const id = newId('card');
  const created_at = now();
  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, columnId, content, authorName, pos, created_at);
  return {
    id,
    column_id: columnId,
    board_id: column.board_id,
    content,
    author_name: authorName,
    position: pos,
    created_at,
    comments: [],
  };
}

export function moveCard({ cardId, targetColumnId, targetIndex }) {
  const card = db
    .prepare('SELECT id, column_id FROM cards WHERE id = ?')
    .get(cardId);
  if (!card) return null;
  const targetColumn = db
    .prepare('SELECT id, board_id FROM board_columns WHERE id = ?')
    .get(targetColumnId);
  if (!targetColumn) return null;

  tx(() => {
    if (card.column_id === targetColumnId) {
      const cards = db
        .prepare(
          'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC',
        )
        .all(targetColumnId)
        .map((r) => r.id)
        .filter((id) => id !== cardId);
      const idx = Math.max(0, Math.min(targetIndex, cards.length));
      cards.splice(idx, 0, cardId);
      const update = db.prepare(
        'UPDATE cards SET position = ? WHERE id = ?',
      );
      cards.forEach((id, i) => update.run(i, id));
    } else {
      const sourceCards = db
        .prepare(
          'SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position ASC',
        )
        .all(card.column_id, cardId)
        .map((r) => r.id);
      const targetCards = db
        .prepare(
          'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC',
        )
        .all(targetColumnId)
        .map((r) => r.id);
      const idx = Math.max(0, Math.min(targetIndex, targetCards.length));
      targetCards.splice(idx, 0, cardId);
      db.prepare('UPDATE cards SET column_id = ? WHERE id = ?').run(
        targetColumnId,
        cardId,
      );
      const update = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
      sourceCards.forEach((id, i) => update.run(i, id));
      targetCards.forEach((id, i) => update.run(i, id));
    }
  });

  return {
    card_id: cardId,
    from_column_id: card.column_id,
    to_column_id: targetColumnId,
    board_id: targetColumn.board_id,
    new_index: targetIndex,
  };
}

export function addComment({ cardId, content, authorName }) {
  const card = db
    .prepare(
      `SELECT c.id, bc.board_id
         FROM cards c
         JOIN board_columns bc ON bc.id = c.column_id
        WHERE c.id = ?`,
    )
    .get(cardId);
  if (!card) return null;
  const id = newId('cmt');
  const created_at = now();
  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, cardId, content, authorName, created_at);
  return {
    id,
    card_id: cardId,
    board_id: card.board_id,
    content,
    author_name: authorName,
    created_at,
  };
}

export function getBoardIdForCard(cardId) {
  const row = db
    .prepare(
      `SELECT bc.board_id
         FROM cards c JOIN board_columns bc ON bc.id = c.column_id
        WHERE c.id = ?`,
    )
    .get(cardId);
  return row?.board_id ?? null;
}

export default db;
