import { DatabaseSync } from 'node:sqlite';
import { nanoid } from 'nanoid';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const dbPath = path.join(DATA_DIR, 'retro.sqlite');
export const db = new DatabaseSync(dbPath);

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
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position REAL NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_columns_board ON board_columns(board_id);

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    position REAL NOT NULL,
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

const now = () => Date.now();

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

const DEFAULT_COLUMNS = [
  { title: 'Went Well', position: 1 },
  { title: 'To Improve', position: 2 },
  { title: 'Action Items', position: 3 }
];

// Prepared statements
const stmtInsertBoard = db.prepare('INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)');
const stmtInsertColumn = db.prepare(
  'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)'
);
const stmtListBoards = db.prepare(
  `SELECT b.id, b.title, b.created_at,
    (SELECT COUNT(*) FROM cards c
       JOIN board_columns bc ON bc.id = c.column_id
       WHERE bc.board_id = b.id) AS card_count
   FROM boards b
   ORDER BY b.created_at DESC`
);
const stmtGetBoard = db.prepare('SELECT * FROM boards WHERE id = ?');
const stmtGetColumns = db.prepare(
  'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC, created_at ASC'
);
const stmtGetCards = db.prepare(
  `SELECT c.* FROM cards c
   JOIN board_columns bc ON bc.id = c.column_id
   WHERE bc.board_id = ?
   ORDER BY c.position ASC, c.created_at ASC`
);
const stmtGetBoardId = db.prepare('SELECT id FROM boards WHERE id = ?');
const stmtMaxColumnPos = db.prepare(
  'SELECT COALESCE(MAX(position), 0) AS p FROM board_columns WHERE board_id = ?'
);
const stmtGetColumnById = db.prepare('SELECT * FROM board_columns WHERE id = ?');
const stmtGetColumnRef = db.prepare('SELECT id, board_id FROM board_columns WHERE id = ?');
const stmtMaxCardPos = db.prepare(
  'SELECT COALESCE(MAX(position), 0) AS p FROM cards WHERE column_id = ?'
);
const stmtInsertCard = db.prepare(
  'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
);
const stmtGetCardById = db.prepare('SELECT * FROM cards WHERE id = ?');
const stmtGetCardWithBoard = db.prepare(
  'SELECT c.*, bc.board_id AS board_id FROM cards c JOIN board_columns bc ON bc.id = c.column_id WHERE c.id = ?'
);
const stmtPeersInColumn = db.prepare(
  'SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position ASC, created_at ASC'
);
const stmtUpdateCardPosition = db.prepare(
  'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
);
const stmtGetCardForComment = db.prepare(
  'SELECT c.id AS card_id, bc.board_id AS board_id FROM cards c JOIN board_columns bc ON bc.id = c.column_id WHERE c.id = ?'
);
const stmtInsertComment = db.prepare(
  'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
);
const stmtGetCommentById = db.prepare('SELECT * FROM comments WHERE id = ?');

export function createBoard(title) {
  const id = nanoid(10);
  const ts = now();
  transaction(() => {
    stmtInsertBoard.run(id, title, ts);
    for (const col of DEFAULT_COLUMNS) {
      stmtInsertColumn.run(nanoid(10), id, col.title, col.position, ts);
    }
  });
  return getBoard(id);
}

export function listBoards() {
  return stmtListBoards.all();
}

export function getBoard(id) {
  const board = stmtGetBoard.get(id);
  if (!board) return null;
  const columns = stmtGetColumns.all(id);
  const cards = stmtGetCards.all(id);
  let comments = [];
  if (cards.length > 0) {
    const placeholders = cards.map(() => '?').join(',');
    const stmt = db.prepare(
      `SELECT * FROM comments WHERE card_id IN (${placeholders}) ORDER BY created_at ASC`
    );
    comments = stmt.all(...cards.map((c) => c.id));
  }
  return { ...board, columns, cards, comments };
}

export function addColumn(boardId, title) {
  const board = stmtGetBoardId.get(boardId);
  if (!board) return null;
  const maxRow = stmtMaxColumnPos.get(boardId);
  const maxPos = Number(maxRow?.p ?? 0);
  const id = nanoid(10);
  const ts = now();
  stmtInsertColumn.run(id, boardId, title, maxPos + 1, ts);
  return stmtGetColumnById.get(id);
}

export function addCard({ columnId, content, authorName }) {
  const column = stmtGetColumnRef.get(columnId);
  if (!column) return null;
  const maxRow = stmtMaxCardPos.get(columnId);
  const maxPos = Number(maxRow?.p ?? 0);
  const id = nanoid(10);
  const ts = now();
  stmtInsertCard.run(id, columnId, content, authorName, maxPos + 1, ts);
  const card = stmtGetCardById.get(id);
  return { card, boardId: column.board_id };
}

export function moveCard({ cardId, targetColumnId, targetIndex }) {
  const card = stmtGetCardWithBoard.get(cardId);
  if (!card) return null;
  const targetColumn = stmtGetColumnRef.get(targetColumnId);
  if (!targetColumn || targetColumn.board_id !== card.board_id) return null;

  const fromColumnId = card.column_id;

  transaction(() => {
    const peers = stmtPeersInColumn.all(targetColumnId, cardId);
    const safeIndex = Math.max(0, Math.min(targetIndex ?? peers.length, peers.length));
    const newOrder = [...peers.slice(0, safeIndex), { id: cardId }, ...peers.slice(safeIndex)];
    newOrder.forEach((c, idx) => {
      stmtUpdateCardPosition.run(targetColumnId, idx + 1, c.id);
    });
  });

  const updated = stmtGetCardById.get(cardId);
  return { card: updated, boardId: card.board_id, fromColumnId, toColumnId: targetColumnId };
}

export function addComment({ cardId, content, authorName }) {
  const ref = stmtGetCardForComment.get(cardId);
  if (!ref) return null;
  const id = nanoid(10);
  const ts = now();
  stmtInsertComment.run(id, cardId, content, authorName, ts);
  const comment = stmtGetCommentById.get(id);
  return { comment, boardId: ref.board_id };
}

export function getBoardForExport(id) {
  const board = getBoard(id);
  if (!board) return null;
  const columnMap = new Map(board.columns.map((c) => [c.id, c]));
  const commentsByCard = new Map();
  for (const cm of board.comments) {
    if (!commentsByCard.has(cm.card_id)) commentsByCard.set(cm.card_id, []);
    commentsByCard.get(cm.card_id).push(cm);
  }
  const rows = [];
  for (const card of board.cards) {
    const col = columnMap.get(card.column_id);
    const cardComments = commentsByCard.get(card.id) || [];
    if (cardComments.length === 0) {
      rows.push({
        column: col?.title || '',
        card_content: card.content,
        card_author: card.author_name,
        card_created_at: new Date(Number(card.created_at)).toISOString(),
        comment_content: '',
        comment_author: '',
        comment_created_at: ''
      });
    } else {
      for (const cm of cardComments) {
        rows.push({
          column: col?.title || '',
          card_content: card.content,
          card_author: card.author_name,
          card_created_at: new Date(Number(card.created_at)).toISOString(),
          comment_content: cm.content,
          comment_author: cm.author_name,
          comment_created_at: new Date(Number(cm.created_at)).toISOString()
        });
      }
    }
  }
  return { board, rows };
}
