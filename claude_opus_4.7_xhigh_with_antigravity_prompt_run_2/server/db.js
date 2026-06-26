import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.RETRO_DB_PATH
  ? path.resolve(process.env.RETRO_DB_PATH)
  : path.resolve(__dirname, '..', 'data', 'retro.sqlite');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
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
    board_id TEXT NOT NULL,
    title TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
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

const id = () => nanoid(12);
const now = () => Date.now();

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

export const boards = {
  create(title) {
    const board = { id: id(), title: title.trim(), created_at: now() };
    const insertBoard = db.prepare(
      'INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)'
    );
    const insertColumn = db.prepare(
      'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    const tx = db.transaction((b) => {
      insertBoard.run(b.id, b.title, b.created_at);
      DEFAULT_COLUMNS.forEach((columnTitle, idx) => {
        insertColumn.run(id(), b.id, columnTitle, idx, now());
      });
    });
    tx(board);
    return board;
  },

  list() {
    return db
      .prepare('SELECT id, title, created_at FROM boards ORDER BY created_at DESC')
      .all();
  },

  get(boardId) {
    return db
      .prepare('SELECT id, title, created_at FROM boards WHERE id = ?')
      .get(boardId);
  },

  getFull(boardId) {
    const board = this.get(boardId);
    if (!board) return null;
    const columns = db
      .prepare(
        'SELECT id, board_id, title, position, created_at FROM board_columns WHERE board_id = ? ORDER BY position ASC, created_at ASC'
      )
      .all(boardId);
    const columnIds = columns.map((c) => c.id);
    let cards = [];
    let comments = [];
    if (columnIds.length) {
      const placeholders = columnIds.map(() => '?').join(',');
      cards = db
        .prepare(
          `SELECT id, column_id, content, author_name, position, created_at
           FROM cards
           WHERE column_id IN (${placeholders})
           ORDER BY position ASC, created_at ASC`
        )
        .all(...columnIds);
      const cardIds = cards.map((c) => c.id);
      if (cardIds.length) {
        const cardPlaceholders = cardIds.map(() => '?').join(',');
        comments = db
          .prepare(
            `SELECT id, card_id, content, author_name, created_at
             FROM comments
             WHERE card_id IN (${cardPlaceholders})
             ORDER BY created_at ASC`
          )
          .all(...cardIds);
      }
    }
    const cardsByColumn = new Map();
    cards.forEach((card) => {
      const list = cardsByColumn.get(card.column_id) ?? [];
      list.push({ ...card, comments: [] });
      cardsByColumn.set(card.column_id, list);
    });
    const cardLookup = new Map();
    for (const list of cardsByColumn.values()) {
      list.forEach((card) => cardLookup.set(card.id, card));
    }
    comments.forEach((comment) => {
      const card = cardLookup.get(comment.card_id);
      if (card) card.comments.push(comment);
    });
    return {
      ...board,
      columns: columns.map((col) => ({
        ...col,
        cards: cardsByColumn.get(col.id) ?? [],
      })),
    };
  },
};

export const columns = {
  create(boardId, title) {
    const board = boards.get(boardId);
    if (!board) return null;
    const maxPos = db
      .prepare(
        'SELECT COALESCE(MAX(position), -1) AS max FROM board_columns WHERE board_id = ?'
      )
      .get(boardId).max;
    const column = {
      id: id(),
      board_id: boardId,
      title: title.trim(),
      position: maxPos + 1,
      created_at: now(),
    };
    db.prepare(
      'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(column.id, column.board_id, column.title, column.position, column.created_at);
    return column;
  },

  get(columnId) {
    return db
      .prepare(
        'SELECT id, board_id, title, position, created_at FROM board_columns WHERE id = ?'
      )
      .get(columnId);
  },
};

export const cards = {
  create(columnId, content, authorName) {
    const column = columns.get(columnId);
    if (!column) return null;
    const maxPos = db
      .prepare('SELECT COALESCE(MAX(position), -1) AS max FROM cards WHERE column_id = ?')
      .get(columnId).max;
    const card = {
      id: id(),
      column_id: columnId,
      content: content.trim(),
      author_name: authorName.trim(),
      position: maxPos + 1,
      created_at: now(),
    };
    db.prepare(
      'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(card.id, card.column_id, card.content, card.author_name, card.position, card.created_at);
    return { ...card, comments: [] };
  },

  get(cardId) {
    return db
      .prepare(
        'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?'
      )
      .get(cardId);
  },

  move(cardId, targetColumnId, targetIndex) {
    const card = this.get(cardId);
    const target = columns.get(targetColumnId);
    if (!card || !target) return null;
    const sourceColumnId = card.column_id;
    const tx = db.transaction(() => {
      // Take card out of source column
      db.prepare(
        'UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ?'
      ).run(sourceColumnId, card.position);
      // Get current count in target column (after removing if same column)
      const count = db
        .prepare('SELECT COUNT(*) AS n FROM cards WHERE column_id = ? AND id != ?')
        .get(targetColumnId, cardId).n;
      const insertAt = Math.max(0, Math.min(targetIndex ?? count, count));
      // Make room in target column
      db.prepare(
        'UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ? AND id != ?'
      ).run(targetColumnId, insertAt, cardId);
      // Place card
      db.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?').run(
        targetColumnId,
        insertAt,
        cardId
      );
    });
    tx();
    return this.get(cardId);
  },
};

export const comments = {
  create(cardId, content, authorName) {
    const card = cards.get(cardId);
    if (!card) return null;
    const comment = {
      id: id(),
      card_id: cardId,
      content: content.trim(),
      author_name: authorName.trim(),
      created_at: now(),
    };
    db.prepare(
      'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(comment.id, comment.card_id, comment.content, comment.author_name, comment.created_at);
    return comment;
  },
};

export default db;
