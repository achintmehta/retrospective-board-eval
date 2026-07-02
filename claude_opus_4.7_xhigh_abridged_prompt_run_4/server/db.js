import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.RETRO_DATA_DIR
  ? path.resolve(process.env.RETRO_DATA_DIR)
  : path.resolve(__dirname, '..', 'data');

fs.mkdirSync(DATA_DIR, { recursive: true });

const dbPath = path.join(DATA_DIR, 'retro.sqlite');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

export function newId() {
  return randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}

const DEFAULT_COLUMNS = [
  { title: 'Went Well', position: 0 },
  { title: 'To Improve', position: 1 },
  { title: 'Action Items', position: 2 }
];

export function createBoard(title) {
  const id = newId();
  const createdAt = nowIso();
  const insertBoard = db.prepare(
    'INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)'
  );
  const insertColumn = db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  );
  const tx = db.transaction(() => {
    insertBoard.run(id, title, createdAt);
    for (const col of DEFAULT_COLUMNS) {
      insertColumn.run(newId(), id, col.title, col.position);
    }
  });
  tx();
  return getBoard(id);
}

export function listBoards() {
  return db
    .prepare(
      `SELECT b.id, b.title, b.created_at,
              (SELECT COUNT(*) FROM cards c
                 JOIN board_columns bc ON bc.id = c.column_id
                WHERE bc.board_id = b.id) AS card_count
         FROM boards b
        ORDER BY datetime(b.created_at) DESC`
    )
    .all();
}

export function getBoard(boardId) {
  const board = db
    .prepare('SELECT id, title, created_at FROM boards WHERE id = ?')
    .get(boardId);
  if (!board) return null;

  const columns = db
    .prepare(
      'SELECT id, title, position FROM board_columns WHERE board_id = ? ORDER BY position ASC'
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
            ORDER BY datetime(created_at) ASC`
        )
        .all(...cardIds)
    : [];

  const cardsByColumn = new Map(columnIds.map((id) => [id, []]));
  const commentsByCard = new Map(cardIds.map((id) => [id, []]));
  for (const comment of comments) commentsByCard.get(comment.card_id).push(comment);
  for (const card of cards) {
    cardsByColumn.get(card.column_id).push({
      ...card,
      comments: commentsByCard.get(card.id) || []
    });
  }

  return {
    ...board,
    columns: columns.map((col) => ({ ...col, cards: cardsByColumn.get(col.id) || [] }))
  };
}

export function createColumn(boardId, title) {
  const board = db.prepare('SELECT id FROM boards WHERE id = ?').get(boardId);
  if (!board) return null;
  const maxPos = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS pos FROM board_columns WHERE board_id = ?')
    .get(boardId).pos;
  const id = newId();
  const position = maxPos + 1;
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  ).run(id, boardId, title, position);
  return { id, board_id: boardId, title, position, cards: [] };
}

export function createCard({ columnId, content, authorName }) {
  const column = db
    .prepare('SELECT id, board_id FROM board_columns WHERE id = ?')
    .get(columnId);
  if (!column) return null;
  const maxPos = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS pos FROM cards WHERE column_id = ?')
    .get(columnId).pos;
  const id = newId();
  const createdAt = nowIso();
  const position = maxPos + 1;
  db.prepare(
    `INSERT INTO cards (id, column_id, content, author_name, created_at, position)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, columnId, content, authorName, createdAt, position);
  return {
    id,
    column_id: columnId,
    content,
    author_name: authorName,
    created_at: createdAt,
    position,
    board_id: column.board_id,
    comments: []
  };
}

export function moveCard({ cardId, toColumnId, toIndex }) {
  const card = db
    .prepare('SELECT id, column_id FROM cards WHERE id = ?')
    .get(cardId);
  if (!card) return null;
  const target = db
    .prepare('SELECT id, board_id FROM board_columns WHERE id = ?')
    .get(toColumnId);
  if (!target) return null;

  const tx = db.transaction(() => {
    const fromColumnId = card.column_id;
    if (fromColumnId === toColumnId) {
      const cards = db
        .prepare('SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC')
        .all(toColumnId)
        .map((c) => c.id);
      const currentIndex = cards.indexOf(cardId);
      cards.splice(currentIndex, 1);
      const clamped = Math.max(0, Math.min(toIndex, cards.length));
      cards.splice(clamped, 0, cardId);
      const update = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
      cards.forEach((id, idx) => update.run(idx, id));
    } else {
      db.prepare('UPDATE cards SET column_id = ? WHERE id = ?').run(toColumnId, cardId);

      const sourceCards = db
        .prepare('SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position ASC')
        .all(fromColumnId, cardId)
        .map((c) => c.id);
      const updateSource = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
      sourceCards.forEach((id, idx) => updateSource.run(idx, id));

      const destCards = db
        .prepare('SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position ASC')
        .all(toColumnId, cardId)
        .map((c) => c.id);
      const clamped = Math.max(0, Math.min(toIndex, destCards.length));
      destCards.splice(clamped, 0, cardId);
      const updateDest = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
      destCards.forEach((id, idx) => updateDest.run(idx, id));
    }
  });
  tx();

  const updated = db
    .prepare(
      `SELECT c.id, c.column_id, c.content, c.author_name, c.created_at, c.position, bc.board_id
         FROM cards c
         JOIN board_columns bc ON bc.id = c.column_id
        WHERE c.id = ?`
    )
    .get(cardId);
  return updated;
}

export function createComment({ cardId, content, authorName }) {
  const card = db
    .prepare(
      `SELECT c.id, bc.board_id
         FROM cards c
         JOIN board_columns bc ON bc.id = c.column_id
        WHERE c.id = ?`
    )
    .get(cardId);
  if (!card) return null;
  const id = newId();
  const createdAt = nowIso();
  db.prepare(
    `INSERT INTO comments (id, card_id, content, author_name, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, cardId, content, authorName, createdAt);
  return {
    id,
    card_id: cardId,
    content,
    author_name: authorName,
    created_at: createdAt,
    board_id: card.board_id
  };
}

export function getBoardIdForColumn(columnId) {
  return db
    .prepare('SELECT board_id FROM board_columns WHERE id = ?')
    .get(columnId)?.board_id;
}
