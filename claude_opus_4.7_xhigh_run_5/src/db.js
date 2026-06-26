import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
mkdirSync(DATA_DIR, { recursive: true });

const dbPath = path.join(DATA_DIR, 'retro.sqlite');
const db = new DatabaseSync(dbPath);

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

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

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    position INTEGER NOT NULL
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

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

const stmts = {
  insertBoard: db.prepare('INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)'),
  listBoards: db.prepare('SELECT id, title, created_at FROM boards ORDER BY created_at DESC'),
  getBoard: db.prepare('SELECT id, title, created_at FROM boards WHERE id = ?'),

  insertColumn: db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  ),
  listColumns: db.prepare(
    'SELECT id, board_id, title, position FROM board_columns WHERE board_id = ? ORDER BY position ASC'
  ),
  getColumn: db.prepare(
    'SELECT id, board_id, title, position FROM board_columns WHERE id = ?'
  ),
  maxColumnPosition: db.prepare(
    'SELECT COALESCE(MAX(position), -1) AS max FROM board_columns WHERE board_id = ?'
  ),

  insertCard: db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, created_at, position) VALUES (?, ?, ?, ?, ?, ?)'
  ),
  listCardsByBoard: db.prepare(`
    SELECT c.id, c.column_id, c.content, c.author_name, c.created_at, c.position
    FROM cards c
    JOIN board_columns col ON col.id = c.column_id
    WHERE col.board_id = ?
    ORDER BY c.position ASC, c.created_at ASC
  `),
  getCard: db.prepare(
    'SELECT id, column_id, content, author_name, created_at, position FROM cards WHERE id = ?'
  ),
  moveCard: db.prepare(
    'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
  ),
  maxCardPosition: db.prepare(
    'SELECT COALESCE(MAX(position), -1) AS max FROM cards WHERE column_id = ?'
  ),

  insertComment: db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
  ),
  listCommentsByBoard: db.prepare(`
    SELECT cm.id, cm.card_id, cm.content, cm.author_name, cm.created_at
    FROM comments cm
    JOIN cards c ON c.id = cm.card_id
    JOIN board_columns col ON col.id = c.column_id
    WHERE col.board_id = ?
    ORDER BY cm.created_at ASC
  `),
  getComment: db.prepare(
    'SELECT id, card_id, content, author_name, created_at FROM comments WHERE id = ?'
  ),
  getBoardIdForCard: db.prepare(`
    SELECT col.board_id AS board_id
    FROM cards c
    JOIN board_columns col ON col.id = c.column_id
    WHERE c.id = ?
  `),
  getBoardIdForColumn: db.prepare(
    'SELECT board_id FROM board_columns WHERE id = ?'
  ),
};

export const repo = {
  createBoard({ title }) {
    const id = randomUUID();
    const createdAt = Date.now();
    db.exec('BEGIN');
    try {
      stmts.insertBoard.run(id, title, createdAt);
      DEFAULT_COLUMNS.forEach((colTitle, idx) => {
        stmts.insertColumn.run(randomUUID(), id, colTitle, idx);
      });
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    return this.getBoardWithContents(id);
  },

  listBoards() {
    return stmts.listBoards.all();
  },

  getBoard(id) {
    return stmts.getBoard.get(id);
  },

  getBoardWithContents(boardId) {
    const board = stmts.getBoard.get(boardId);
    if (!board) return null;
    const columns = stmts.listColumns.all(boardId);
    const cards = stmts.listCardsByBoard.all(boardId);
    const comments = stmts.listCommentsByBoard.all(boardId);
    return { ...board, columns, cards, comments };
  },

  createColumn({ boardId, title }) {
    const board = stmts.getBoard.get(boardId);
    if (!board) return null;
    const id = randomUUID();
    const { max } = stmts.maxColumnPosition.get(boardId);
    const position = max + 1;
    stmts.insertColumn.run(id, boardId, title, position);
    return stmts.getColumn.get(id);
  },

  createCard({ columnId, content, authorName }) {
    const column = stmts.getColumn.get(columnId);
    if (!column) return null;
    const id = randomUUID();
    const createdAt = Date.now();
    const { max } = stmts.maxCardPosition.get(columnId);
    const position = max + 1;
    stmts.insertCard.run(id, columnId, content, authorName, createdAt, position);
    return { card: stmts.getCard.get(id), boardId: column.board_id };
  },

  moveCard({ cardId, toColumnId, position }) {
    const targetColumn = stmts.getColumn.get(toColumnId);
    if (!targetColumn) return null;
    const card = stmts.getCard.get(cardId);
    if (!card) return null;
    const pos = Number.isFinite(position)
      ? position
      : stmts.maxCardPosition.get(toColumnId).max + 1;
    stmts.moveCard.run(toColumnId, pos, cardId);
    return { card: stmts.getCard.get(cardId), boardId: targetColumn.board_id };
  },

  createComment({ cardId, content, authorName }) {
    const row = stmts.getBoardIdForCard.get(cardId);
    if (!row) return null;
    const id = randomUUID();
    const createdAt = Date.now();
    stmts.insertComment.run(id, cardId, content, authorName, createdAt);
    return { comment: stmts.getComment.get(id), boardId: row.board_id };
  },
};

export default db;
